# ArtNiyyətli Phase 12 — Performance + Security Hardening: Audit & Design

## Purpose

Harden the **existing** application for production without changing its intended functionality, its public API contract, or its architecture. This document is the outcome of a read-only audit of the repository as it stands on 2026-09-20 (commit `599afde`), and it defines the target state for Phase 12. The companion implementation plan is `docs/superpowers/plans/2026-09-20-phase-12-performance-security-hardening.md`.

Nothing in application code, `.env`, or `work-files/` was modified by the audit.

## Audit method and limits

**Method.** Static review of routes, middleware/bootstrap, controllers, form requests, resources, services, models, migrations, config, Blade views, the Docker/nginx/PHP configuration, and the React public + admin frontends; plus non-destructive runtime probes against the local dev stack (`http://localhost:8080`): response headers, cookies, CORS preflight, malformed-input requests, static-file exposure, `/storage` traversal attempts, in-process per-endpoint query counting with `DB::enableQueryLog()`, an in-process admin request probe, `composer audit`, `npm audit`, `composer outdated`, `npm outdated`, and a slug-conformance query.

**Limits (read these before trusting a number).**
- The dev dataset is tiny (1 active artwork, 6 artists, 0 exhibitions). Query counts reflect *fixed overhead and eager-loading structure*, not behaviour at scale. Anything marked **unverified at scale** needs the Task 0 benchmark before any optimisation is written.
- The dev environment runs `APP_ENV=local`, `APP_DEBUG=true`, `CACHE_STORE=database`, `SESSION_DRIVER=database`. Production values are not in the repository; production findings are therefore derived from `.env.example`, `config/*.php` defaults and the existing tests.
- `.env` was **not** read by the audit (runtime `config()` values were read instead).
- No load testing, TLS/HTTP-2 inspection, or penetration testing was done. Login *timing* (user-enumeration by response time) was not evaluated.
- Probes wrote a handful of anonymous `sessions` rows and rate-limiter `cache` rows in the dev DB; no content data was changed.

## Severity legend

| Level | Meaning in this document |
|---|---|
| CRITICAL | Remotely exploitable without authentication, or direct data/credential exposure. |
| HIGH | Real, verified, materially harmful to availability/performance or security in normal production use. |
| MEDIUM | Real and verified (or conditional on a stated deployment choice) with bounded impact. |
| LOW | Real but small: robustness, hygiene, or defence-in-depth. |
| INFORMATIONAL | Observation, decision point, or note; no fix required by itself. |

"Real" = reproduced or proven by code reading. "Theoretical/unverified" is stated explicitly and never rated above LOW.

## Executive summary

- **No CRITICAL findings.** No SQL injection, no XSS sink, no auth bypass, no IDOR, no secret exposure, no path traversal, no vulnerable dependency (`composer audit` and `npm audit` are clean) was found.
- The security baseline is genuinely good: layered admin gates that re-check `is_active` on every request, login throttling per user+IP and per IP, session regeneration, enforced CSRF on the admin surface, allow-listed mass assignment, strict enum/`in` validation on public inputs, GD re-encoding of every upload with server-derived extensions and UUID paths, escaped Blade output, and a safe JSON-LD encoder.
- The two **HIGH** findings are both **performance/availability** problems on the *public* path, not vulnerabilities: every anonymous page view starts a database session, and the public API request budget is consumed by redundant frontend fetches and an expensive database-backed rate limiter.
- The seven **MEDIUM** findings are: incomplete/nginx-only security headers, no trusted-proxy configuration (deployment-conditional), production-config footguns with no preflight, an incomplete media-deletion reference check (already producing a dangling reference in dev data), no pixel ceiling on image uploads, no caching / HTTP cache validators, and no compression/asset caching in the repo's nginx config.
- Sixteen **LOW** findings are small, mostly one-file fixes.

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 7 |
| LOW | 16 |
| INFORMATIONAL | 8 |

## Findings register

Type key: **V** = security weakness/vulnerability, **R** = robustness/integrity, **P** = performance, **C** = configuration.

The resolution of every finding below (what was done, in which task, or why it is deferred) is recorded in the
"Task 14 — Resolution register" section at the end of this document.

### HIGH

**P-01 — Every anonymous public page view starts a database session and sets cookies. (P)**
- *Evidence.* `GET /collectors` and `GET /` return `Set-Cookie: XSRF-TOKEN=…` and `Set-Cookie: artniyyetli-session=…` and `Cache-Control: no-cache, private`. The in-process query log for `/collectors` shows `select … from sessions` ×2 and `insert into sessions`. At audit time the `sessions` table held 15 anonymous rows out of 17 (some created by the audit's own probes; the mechanism is confirmed by the headers and query log). `routes/web.php` runs the public SPA shell (`/` and `/{any}`) inside the default `web` middleware group; `SESSION_DRIVER=database`.
- *Impact.* One DB write per first visit *and per cookie-less crawler request*; unbounded `sessions` growth (garbage collection is lottery-based, 2/100); HTML can never be shared-cached (CDN/proxy will not cache a response carrying `Set-Cookie`); a privacy cost (tracking-style cookies on a read-only public site).
- *Affected.* `routes/web.php`, `config/session.php` (lottery), `resources/views/public.blade.php` (does not use `@csrf`; no session need).
- *Fix.* Task 6.

**P-02 — The public API request budget is consumed by redundant frontend fetches and an expensive rate limiter. (P)**
- *Evidence (frontend).* `resources/js/public/layout/Header.jsx:17-19` and `Footer.jsx:16-18` each independently call `getNavigation`, `getSiteSettings` and `listSocialLinks`. A hard page load therefore issues **6 shell requests** (3 duplicated pairs) **plus** the page's own data (≥ 1; the homepage adds `/homepage`, which itself already contains `social_links`). A locale switch re-issues all of them (`deps = [locale]`).
- *Evidence (backend).* All `/api/v1/*` routes share `throttle:public-api` = 60/min/IP (`AppServiceProvider`). The limiter runs on the `database` cache store: `/api/v1/faqs` (which needs 2 data queries) executes **8 SQL statements**, six of them limiter overhead, including `SELECT … FOR UPDATE` + `UPDATE` on a per-IP row (a write lock on every public request). `config/cache.php` sets no `limiter` store.
- *Impact.* ≈ 8 hard loads/minute exhaust one IP's budget → users on shared/CGNAT/office IPs get `429`s under modest traffic; per-request DB cost is ~3× what the data alone needs; the per-IP row lock serialises concurrent requests from one IP.
- *Affected.* `Header.jsx`, `Footer.jsx`, `resources/js/public/lib/useApiData.js`, `app/Providers/AppServiceProvider.php`, `config/cache.php`.
- *Fix.* Tasks 7 and 8.

### MEDIUM

**S-01 — Security headers are incomplete and exist only in nginx. (V/C)**
- *Evidence.* Responses carry `X-Frame-Options: SAMEORIGIN` and `X-Content-Type-Options: nosniff` (from `docker/nginx/default.conf`, without `always`, so not on 4xx/5xx). Absent everywhere: `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`, `Cross-Origin-Opener-Policy`, and `Strict-Transport-Security` (only meaningful over HTTPS). Nothing at the Laravel layer, so any non-nginx front (or a future host) ships none, and none is unit-testable.
- *Affected.* new middleware, `bootstrap/app.php`, `docker/nginx/default.conf`, `resources/js/public/components/EnquiryForm.jsx` (inline `style` on the honeypot blocks a strict `style-src`).
- *Fix.* Task 2.

**S-02 — No trusted-proxy configuration. (V/C — deployment-conditional)**
- *Evidence.* No `trustProxies`/`trustHosts` anywhere in `app/`, `bootstrap/`, `config/`, `routes/`.
- *Impact.* Behind any reverse proxy, load balancer or CDN, `$request->ip()` becomes the proxy address: **all** visitors share one bucket for `public-api` (60/min), `enquiry-submission` (5/hour) and login throttling (20/min/IP) — a single abuser locks everyone out, and the enquiry form dies after five submissions site-wide. Scheme detection (`secure()`, generated URLs, `Secure` cookies) is also wrong behind TLS termination. Not exploitable today on the single-nginx dev stack.
- *Fix.* Task 3.

**S-03 — Production-config footguns and no preflight. (C)**
- *Evidence.* `.env.example` ships `APP_ENV=local`, `APP_DEBUG=true`, `LOG_LEVEL=debug`, `SESSION_SECURE_COOKIE=false`, `APP_URL=http://localhost:8080`; `composer setup` copies it to `.env`. The dev app returns a full exception class, file path and stack trace for `GET /api/v1/nope`. The *production* behaviour is covered by `PublicApiSecurityTest::test_unknown_route_is_404_json_with_no_internal_detail_in_production`, but nothing prevents deploying with the dev values, and `APP_URL` also drives canonical URLs, sitemap and every media URL.
- *Fix.* Task 1.

**S-04 — Media deletion ignores three of the places media is referenced. (R)**
- *Evidence.* `MediaService::isReferenced()` checks artwork images, artist representation, exhibition media, social-link logos and SEO OG images only. It does **not** check article gallery media (`article_media`, `Media::articles()` exists but is unused), page-section images (`page_sections.media_id`), or the site logo (`site_settings.logo_media_id`). Because `Media` is soft-deleted, foreign keys never fire. **Verified in dev data:** 1 soft-deleted media row is still referenced by a page section/article.
- *Impact.* Silent loss of images on public pages/articles/the brand mark; admin UI shows an empty picker for an id that "exists".
- *Affected.* `app/Services/Admin/MediaService.php`, `app/Models/Media.php`, `app/Exceptions/MediaDeletionNotAllowedException.php` usage/message.
- *Fix.* Task 5.

**S-05 — No pixel-dimension ceiling before GD decodes an upload. (V/R — analysis-based, threshold to be confirmed)**
- *Evidence.* `StoreMediaRequest` caps the *file size* (10 MB) and type; `MediaService::upload()` calls `imagecreatefromstring()` on the whole binary *before* any dimension check, and `MediaVariantGenerator` decodes it again. PHP `memory_limit` is 256M (`docker/php/conf.d/local.ini`). GD needs ≈ 4 bytes/pixel: a small, highly compressible PNG/WebP declaring e.g. 15 000 × 15 000 px (≈ 900 MB decoded) passes the 10 MB limit and is a fatal "memory exhausted" → HTTP 500 with no friendly message. The same applies to legitimate high-resolution gallery photography (a 48 MP scan ≈ 190 MB decoded plus resample copies).
- *Impact.* Authenticated (admin/editor) only; bounded by `memory_limit`, so it is an availability/UX defect, not a remote DoS. **Confirm actual thresholds with the Task 5 benchmark before choosing the ceiling.**
- *Fix.* Task 5.

**P-03 — No caching of repeated reads and no HTTP cache validators on public responses. (P)**
- *Evidence.* `SiteSettingService::all()` (2 queries: settings + logo media) is called from `SiteSettingController`, `EnquiryService`, `ArtworkDetailResource` (per artwork-detail request), `PublicPageSeoResolver::home`, and `EnquiryReplyMail`, uncached. `SitemapController` loads every artwork/artist/exhibition/article on every request. Public API responses carry `Cache-Control: no-cache, private`, no `ETag`. Measured SQL per request on the dev dataset (of which ≈ 6 are the limiter, see P-02): `/api/v1/homepage` 27, `/api/v1/artworks` 18, `/api/v1/artworks/{code}` 21, `/api/v1/pages/{slug}` 10, `/` (SSR) 10, `/sitemap.xml` 9. Navigation, settings and social links change rarely but are re-queried on every call.
- *Affected.* `SiteSettingService`, `NavigationController`, `SitemapController`, `HomepageController`, new cache support class + admin-write invalidation, new API cache-header middleware.
- *Fix.* Task 9.

**P-04 — The repo's nginx config has no compression and no asset caching. (P/C)**
- *Evidence.* Requests with `Accept-Encoding: gzip` for `/collectors`, `/api/v1/homepage` and `/build/assets/main-*.js` return **no `Content-Encoding`**; hashed `/build/assets/*` and `/storage/media/*` responses carry no `Cache-Control`/`Expires` (only `Last-Modified`/`ETag` on storage files). The shared React runtime chunk is 219 KB, the admin bundle 123 KB, uncompressed.
- *Scope note.* The nginx file in the repo is the only web-server config; final production infrastructure is Phase 13. Phase 12 fixes the in-repo config and documents the required behaviour so Phase 13 inherits it.
- *Fix.* Task 12.

### LOW

| ID | Type | Finding (evidence) | Fix |
|---|---|---|---|
| S-06 | R | `?search[]=x` returns **500** ("Array to string conversion") on all six admin list endpoints (media, artworks, artists, articles, exhibitions, enquiries) — *reproduced*. Filters (`status`, `type`, `from`/`to`) are read raw from the query string; invalid values silently return empty sets. Authenticated users only. | Task 4 |
| S-07 | V | Login `username`/`password` have no `max` (verified not exploitable: a 400-char username returns 422, not 500, and CSRF is enforced — 419 without a token). User passwords are `min:8` only, no upper bound/complexity. Hygiene fix. | Task 4 |
| S-08 | R | Slug fields (`translations.*.slug`, 5 entity types) are only `required|string|max:255` + uniqueness — no format rule, no reserved list. A slug containing `/`, `?`, `#`, spaces or starting with `admin`/`api` breaks routing (`/{any}` excludes paths starting `admin`/`api`). *Existing data: 34 slugs, 0 non-conforming, 0 reserved-prefix*, so a strict rule is safe to introduce. | Task 4 |
| S-09 | P | Enquiry notification mail is sent **synchronously** in the public POST (`EnquiryService::sendNotification`); `mail.smtp.timeout` is `null`. A slow SMTP server holds a PHP-FPM worker and delays the visitor's response. Failure is already caught and logged. | Task 10 |
| S-10 | V | `DatabaseSeeder` creates `test@example.com` via `UserFactory` with password `password` (role-less, so it cannot pass the `admin.access` gate, but a known-credential account is created by `db:seed`). | Task 1 |
| S-11 | V | Version banners: `X-Powered-By: PHP/8.4.25`, `Server: nginx/1.27.5`. | Task 1 / Task 12 |
| S-12 | C | CORS: `allowed_methods` excludes `POST` (a decoupled frontend could not submit enquiries); `max_age = 0` forces a preflight on every cross-origin request; localhost origins are the default if `PUBLIC_API_CORS_ORIGINS` is unset. Irrelevant for the same-origin SPA (the approved deployment model). | Task 3 |
| S-13 | C | `.env.example` logging: `LOG_STACK=single`, `LOG_LEVEL=debug` — one unbounded file, verbose in production. | Task 1 |
| S-14 | R | `whatsapp_number` is free-form (max 50) and concatenated into `https://wa.me/{number}` unmodified (spaces/`+` break the link; the prefix is fixed so the host cannot be changed — no injection). Also `all()['whatsapp_number'] ?? config(...)` never falls back because an emptied setting is stored as `''`, not `null`. | Task 4 |
| S-15 | V/decision | Public variants live at predictable `storage/media/{sequential-id}/{variant}.webp` on the public disk: images of inactive (draft) artworks and *soft-deleted* media stay reachable to anyone who guesses ids. Originals are private (good). Likely acceptable for a gallery; flagged as a decision (see Open decisions). | Task 5 (decision-gated) |
| S-16 | R | If the upload DB transaction fails after variants are written, the public-disk variant files are orphaned (only the private original is cleaned up). | Task 5 |
| S-17 | V | Admin write endpoints other than login and media upload have no throttle (authenticated, so low risk). | Task 7 (optional) |
| P-05 | P — **unverified at scale** | `HomepageController` returns *all* `show_on_wall` artworks and *all* active artists fully eager-loaded; `ArtistController@show` loads all of an artist's artworks with 7 nested relations; `/api/v1/artists` is unpaginated. Eager loading is otherwise thorough (no N+1 found). Needs the Task 0 dataset benchmark to decide whether anything is worth changing. | Task 11 |
| P-06 | P | Public `<img>` tags (`ImageWithFallback`, `BrandMark`) have no `loading="lazy"`/`decoding="async"`; a catalogue page eagerly loads up to 24 images. | Task 8 |
| P-07 | P/SEO | Sitemap `<loc>` values are not percent-encoded (Unicode slugs) and the sitemap is not size-bounded (protocol limit 50 000 URLs). | Task 11 |
| P-08 | P — **unverified** | Rate-limiter keys accumulate in the `cache` table (login keys include the attacker-chosen username); the database cache store has no TTL-native eviction. Moot if the limiter moves off the DB store (P-02 fix). | Task 7 |

### INFORMATIONAL

- **I-01** `PageController@show` (and the SSR resolver) look up `PageTranslation` by `slug` only, ignoring locale; the unique key is `(slug, locale)`, so two pages could share a slug across locales and `first()` would pick arbitrarily. No conflict exists in current data.
- **I-02** The catch-all route regex `^(?!admin|api).*$` also excludes any top-level slug that merely *starts with* `admin`/`api`. Covered by the reserved-slug rule in Task 4.
- **I-03** Admin `search` uses `LIKE %term%`: bound parameters (no injection), but `%`/`_` are not escaped and the leading wildcard cannot use an index. Admin-only, small tables.
- **I-04** Admin enquiry resources expose `ip_address` and `user_agent` to any editor. Intentional for triage; note for privacy review.
- **I-05** `laravel/framework` 13.31.0 → 13.32.0 (patch) and `jsdom` 30.0.1 → 30.1.0 are available; `phpunit` 13 is a major. No advisories. Do not upgrade blindly (Task 13 is a gated patch update only).
- **I-06** Login response *timing* (existence oracle for usernames) was not evaluated; message parity is already tested.
- **I-07** `Model::preventLazyLoading()` / `shouldBeStrict()` are not enabled in non-production, so an N+1 regression would go unnoticed (Task 0 adds this as tooling).
- **I-08** `SocialLinks.jsx` renders `link.url` as-is; the http/https allow-list is enforced only at write time. A cheap render-time guard would add defence in depth (Task 4).

## Verified-good areas (no action; do not re-audit)

**1 Authentication & authorization.** `Gate admin.access` (administrator|editor) and `admin.manage-users` (administrator) both require `is_active` and are enforced by route middleware (`auth` + `can:`); form-request `authorize()` returning `true` is deliberate and documented. Deactivating a user revokes access on the next request (tested). Last-active-administrator guard on update/delete. Session regenerated on login; logout invalidates the session; passwords hashed via the `hashed` cast and never serialised (`#[Hidden]`, `UserResource`). Admin/editor content is intentionally global (single-tenant CMS), so there is no per-owner IDOR surface; routes with two model bindings do not exist except `pages/{page}/sections` (store/reorder scoped through the page relation). 21 existing tests in `AdminAuthTest` cover login, throttling (per user+IP and per IP), deactivation, session regeneration and role gates.

**2 Validation & input handling.** Public inputs use form requests with `Rule::enum`/`Rule::in`; array-valued inputs are rejected (`?sort[]=`, `?filter[]=`, `?genre[]=` → 422; probed). `PaginationParams` clamps `per_page`. Enquiry form request is a strict allow-list that also rejects unexpected fields, has a honeypot and an `is_active` artwork check. 38 of 39 models use `#[Fillable]`; `NavigationItem` uses `$fillable`; none use `$guarded = []`. Foreign-key inputs use `Rule::exists(...)->whereNull('deleted_at')`.

**3 API security.** Admin routes return JSON 401/403; public routes are GET-only (POST on every GET route rejected — tested) except the enquiry POST; public resources expose no internal columns (`is_active`, timestamps, `year_sold`, ids beyond artist/exhibition-artist ids); `price` is gated by `show_price`. Rate-limit headers present. Production error bodies are generic (tested).

**4 XSS / injection / CSRF.** No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `javascript:` sinks anywhere in `resources/js`. Blade uses `{{ }}` everywhere; the only three `{!! !!}` uses are `nl2br(e(...))` (×2) and JSON-LD encoded with `JSON_HEX_TAG | JSON_HEX_AMP`. `SeoText::description()` strips tags. All queries use bound parameters. CSRF is enforced on the admin surface (419 without token) with the `XSRF-TOKEN` header wired in `admin/lib/api.js`. YouTube URLs are host-allow-listed and reduced to an 11-character id; embeds use `youtube-nocookie.com`.

**5 File/media security (upload path).** Extension is derived from the *detected* MIME, never the client name; storage path is `media/{uuid}/original.{ext}`; MIME allow-list (jpeg/png/webp); `getimagesize` + `imagecreatefromstring` content validation; every public variant is re-encoded through GD (strips metadata and polyglot payloads); originals live on the private disk; `/storage` traversal attempts return 403/400/404 (probed); dotfiles, `vendor`, `composer.json`, `artisan`, logs are not reachable (probed).

**6 Database.** Eager loading in all public controllers is comprehensive (no N+1 found: query counts are constant in relations). Indexes exist on the hot filter/sort columns and unique `(slug, locale)` keys support every slug lookup. Public and admin lists are paginated with hard caps (24 default/60 max public, 100 max admin).

**8/9 Configuration.** `session.http_only=true`, `same_site=lax`, JSON serialisation, cookie encryption on, bcrypt rounds 12, `SESSION_SECURE_COOKIE` env-driven, `.env*` git-ignored, dotfile access denied by nginx, `APP_URL`-derived canonical/sitemap/email URLs (not the Host header — no host-header poisoning of generated links).

**10 Dependencies.** `composer audit`: no advisories. `npm audit` (prod and dev): 0 vulnerabilities. Direct dependencies are current except the patch/minor items in I-05.

**11 Public frontend.** No third-party scripts; fonts are self-hosted by the Vite font plugin (no external font host); React escapes all rendered API strings; external links use `rel="noreferrer"`; only `localStorage` use is the locale preference (try/catch-guarded).

**12 SEO.** Canonical URLs from `APP_URL`; 404 status returned for unknown/inactive pages with `noindex`; `robots.txt` disallows `/admin` and `/api`; sitemap lists only active/published entries.

## Design: target state

### Principles
1. **No contract change.** No API response shape, route, status code (except turning existing 500s into 4xx), or admin workflow changes. `docs/frontend-current-api-guide.md` is not modified by this phase.
2. **Evidence-gated performance work.** Measure → change → re-measure using the Task 0 harness. No optimisation without a number.
3. **Fail safe, configurable, reversible.** Every new behaviour that could break a deployment (CSP enforcement, HTTP cache TTLs, trusted proxies, upload ceilings) is env-configurable with a safe default and a documented rollback (set the env var).
4. **Small, independently deployable tasks**, each ending green: PHPUnit, Vitest (when frontend touched), Pint, `npm run build`.
5. **No new dependencies.** Everything needed is in Laravel/PHP/React already.

### Security headers (Task 2)
A single `App\Http\Middleware\SecurityHeaders` appended globally (web + api), driven by `config/security.php`:
`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, `Cross-Origin-Opener-Policy: same-origin`, and `Strict-Transport-Security: max-age=31536000` **only** when the request is secure and `SECURITY_HSTS=true` (no `includeSubDomains`/`preload` by default).
**CSP** ships in `Content-Security-Policy-Report-Only` first (`SECURITY_CSP=report-only|enforce|off`, default `report-only` outside production, `enforce` only after Task 14 review):
`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: <storage host>; font-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'`.
- The JSON-LD `<script type="application/ld+json">` is a data block and is not governed by `script-src`.
- Production Vite output uses external module scripts/stylesheets only. The Vite dev server (`public/hot` present) needs inline/HMR allowances → the middleware **skips CSP when `public/hot` exists**.
- The one inline style in the frontend (`EnquiryForm` honeypot) is replaced with a CSS class so `style-src 'self'` holds.
- nginx no longer sets these headers (single source of truth, and they now apply to error responses too).

### Session-less public shell (Task 6)
The public SSR shell routes (`/` and `/{any}`) are excluded from the session, cookie-encryption, CSRF and view-error-sharing middleware (`Route::withoutMiddleware([...])`). `/admin` keeps them (the admin SPA needs `XSRF-TOKEN`). Public HTML is served with `Cache-Control: public, max-age=0, must-revalidate` plus a weak `ETag` (validators only; TTL-based shared caching is a Phase 13 CDN decision). Acceptance: no `Set-Cookie` on public pages; no `sessions` queries.

### Rate limiting and request budget (Tasks 7–8)
- Limiter store moves off the database via `cache.limiter` (`CACHE_LIMITER_STORE`; default `file` locally, Redis in production per Phase 13) — zero limiter SQL, TTL-native eviction.
- Public-frontend shell data (navigation, site settings, social links) is fetched **once per locale** by a shared provider and consumed by Header/Footer: shell requests drop from 6 to 3; a page load from ≥ 7 to ≈ 4.
- Limits become env-tunable (`RATE_LIMIT_PUBLIC_API`, default raised from 60 to 120/min/IP once the request count is halved and the limiter is cheap; enquiry stays at 5/hour/IP).
- Correct client identity depends on Task 3 (trusted proxies).

### Caching (Task 9)
- `App\Support\Cache\PublicContentCache::remember(string $key, int $ttl, Closure $cb)` wraps `Cache::remember` with a **content-version key** (`public-content:version`). Cached: `SiteSettingService::all()` (TTL 300 s), navigation payload (300 s), sitemap XML (600 s), homepage payload per locale (60 s).
- **Invalidation** is by a small middleware on admin *mutating* routes (`POST/PUT/PATCH/DELETE` returning 2xx) that bumps the version once per request. This is deliberately request-level rather than model-event-level so pivot `sync()` calls (article media, exhibition artworks) — which fire no model events — are covered. Out-of-band changes (seeders, tinker) are bounded by the TTL; `php artisan public-cache:flush` is provided.
- Public API GET responses get `Cache-Control: public, max-age=60, stale-while-revalidate=120` and a strong `ETag` (conditional GET → `304`). Rationale: admin edits become visible within ≤ 60 s; documented and env-tunable (`PUBLIC_API_CACHE_TTL`, `0` disables).
- **Not cached:** enquiry POST, admin endpoints, anything per-user.

### Media integrity (Task 5)
- `isReferenced()` extended to article gallery, page-section images and the site logo setting; the 409 message lists which kinds of record block deletion.
- `config('media.max_pixels')` (default derived from the benchmark, provisional 40 MP) and `max_dimension` checked from `getimagesize()` **before** any GD decode; failure → 422 with a clear Azerbaijani/English message (currently a fatal 500).
- Variant files cleaned up if the upload transaction fails.
- `original_filename` truncated to the column-safe length.
- Public-URL obscurity (S-15) is **decision-gated** (see Open decisions); no URL scheme change without approval, because existing `media_variants.path` rows and cached client URLs depend on it.

### Input handling (Task 4)
- `App\Support\Api\QueryParams` (`string()`, `enum()`, `date()`, `escapeLike()`): admin list controllers read filters through it so non-scalar values are ignored (or 422) instead of 500; `LIKE` wildcards escaped.
- `App\Rules\Slug`: `^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$`, max 191, plus a reserved list (`admin`, `api`, `artworks`, `artists`, `exhibitions`, `articles`, `contact`, `sitemap.xml`, `robots.txt`, `storage`, `build`, `up`) and reject a first segment beginning `admin`/`api`. Applied to Page/Artist/Artwork/Article/Exhibition store+update requests. The existing 34 slugs already conform.
- Login: `username` `max:255`, `password` `max:1024`. Users: `Password::min(10)` (letters + numbers) and `max:255`; existing passwords are unaffected.
- WhatsApp: normalised to digits (strip spaces, `+`, punctuation) at write and again at link build; `''` treated as unset.
- Public social-link renderer only emits http/https `href`.

### Configuration hygiene (Task 1)
`php artisan app:preflight` fails (non-zero exit) in production when: `APP_DEBUG=true`, `APP_ENV=local`, `APP_URL` is localhost/http, `APP_KEY` empty, `SESSION_SECURE_COOKIE` is not true, `LOG_LEVEL=debug`, `MAIL_MAILER` is `log`/`array`, `CACHE_STORE`/`SESSION_DRIVER`/limiter store is `array`/`null`, CORS origins are localhost, or `storage:link` is missing. It also warns on `db:seed`-created test accounts. `.env.production.example` (tracked; the git-ignored `.env.production` is untouched) documents every production value. `DatabaseSeeder` no longer creates the test user outside `local`/`testing`.

### Mail (Task 10)
Enquiry notification is sent after the response (`dispatch(...)->afterResponse()`), so no queue worker is required, with `MAIL_TIMEOUT` (default 10 s) set on the SMTP transport. Failure logging and the "no recipient" path are unchanged. `EnquiryReplyMail` (admin-initiated) stays synchronous so the admin sees the real delivery result.

### Static delivery (Task 12)
`docker/nginx/default.conf`: `gzip on` (+ types), `server_tokens off`, `Cache-Control: public, max-age=31536000, immutable` for `/build/assets/`, `Cache-Control: public, max-age=86400` for `/storage/` variants, `location ~* ^/storage/.*\.(php|phtml)$ { deny all; }` as belt-and-braces, `add_header ... always` removed for headers now owned by the app. `docker/php/conf.d/local.ini`: `expose_php = Off`.

### Measurement targets (acceptance)
| Metric | Now | Target |
|---|---|---|
| Set-Cookie on public HTML | 2 cookies | 0 |
| `sessions` queries per public page view | 3 | 0 |
| Limiter SQL per public API request | 6 | 0 |
| Shell API requests per hard load | 6 (+page) | 3 (+page) |
| `GET /api/v1/site-settings` data SQL on a warm cache (dev: settings + logo media + logo variants) | 3 | 0 |
| Security headers on 200/404/500 | 2 (nginx, 200 only) | 6 (+CSP report-only), all statuses |
| gzip on HTML/JSON/JS | none | yes |
| Admin list `?search[]=` | 500 | 4xx/ignored |
| Media delete of article/page-section/logo media | allowed | 409 |
| Upload of over-limit-pixel image | fatal 500 | 422 |
| Public query counts | measured in Task 0 | no regression vs Task 0; constant across N (N+1 tests) |

## Non-goals (explicitly out of scope for Phase 12)

- **Phase 13 / infrastructure:** production Docker images, CI/CD pipelines, TLS certificates and termination, CDN/WAF, Redis/queue/worker provisioning, backups, monitoring/alerting/APM, log shipping, autoscaling, object storage migration (`s3` disk), HTTP/2/3 tuning.
- Authentication features: 2FA/MFA, password-reset flow, SSO, session-management UI, account lockout beyond the existing throttling.
- Any change to the public API contract, response shapes, routes, or admin UX; API versioning; pagination of endpoints that are documented as unpaginated (`/artists`, `/faqs`).
- Rich-text/HTML content or a sanitiser (content is plain text today; if HTML is ever introduced it needs its own phase).
- Image pipeline redesign: `srcset`/responsive-image API additions, Imagick, an image CDN, changing the variant URL scheme (unless the S-15 decision approves it).
- Dependency **major** upgrades (PHPUnit 13, etc.); framework upgrades beyond the gated patch in Task 13.
- SSR of SPA body content (only the `<head>` is server-rendered by design), hreflang/i18n SEO, structured-data expansion.
- Cookie-consent/GDPR programme, penetration testing, load-testing infrastructure beyond the local benchmark harness.
- Changes to `work-files/`, `.env`, or unrelated uncommitted files (`artisan` mode bit, `resources/css/app.css`, untracked docs).

## Open decisions (recommended defaults so work is not blocked)

1. **Deployment topology** — same-origin SPA (assumed; matches the approved architecture) vs a decoupled frontend. *Default:* same-origin; Task 3 leaves CORS read-only unless `PUBLIC_API_CORS_ALLOW_POST=true`.
2. **CSP** — ship report-only, then enforce. *Default:* report-only through Task 13, flip to enforce in Task 14 after a manual pass over every public + admin screen with the console open.
3. **Public media URL obscurity (S-15)** — accept (recommended for a public gallery) or add an unguessable path segment for *new* uploads only. *Default:* accept; revisit if unpublished works are commercially sensitive.
4. **Production cache/session/limiter backend** — Redis is expected in Phase 13; Phase 12 code must work with `file`/`database` too. *Default:* limiter on `file` until Phase 13.
5. **Public API cache TTL** — 60 s (edits visible within a minute). *Default:* 60 s, `0` to disable.
6. **Password policy** — `Password::min(10)` letters+numbers. *Default:* as stated; existing accounts unaffected.
7. **Raising `public-api` from 60 to 120/min/IP** — *Default:* yes, after Task 8 halves shell requests.

## Acceptance criteria for the phase

- Every finding above is either fixed with a test, or has an explicit "accepted/deferred" entry with a reason in the Task 14 report.
- PHPUnit, Vitest, Pint and `npm run build` are green; the existing 616 PHP and 486 JS tests are unchanged in meaning.
- `composer audit` and `npm audit` remain clean.
- The measurement table above is re-run at the end and every "Target" is met or explained.
- No public API response body changed (contract tests in `PublicApiSecurityTest` and the per-endpoint API tests stay green untouched).

---

## Task 14 — Resolution register (final verification, 2026-09-21)

Verified against the running Docker stack (nginx 1.27.5 + PHP 8.4 + MySQL 8.4), a headless Chrome, and the full
test suites. "Task N" refers to the numbered tasks of the implementation plan.

### Findings

| ID | Sev. | Resolution |
|---|---|---|
| P-01 | HIGH | **Fixed, Task 6.** Public shell, `robots.txt` and `sitemap.xml` run without the session stack: 0 cookies and 0 `sessions` queries (`PublicShellCookiesTest`; confirmed with curl and in the browser). `/admin` keeps the full `web` group. |
| P-02 | HIGH | **Fixed, Tasks 7 + 8.** Rate-limit counters live in the `file` limiter store (0 limiter SQL; a public API request is 2 SQL, was 8). Header/Footer share one `SiteDataProvider`: 3 shell requests per hard load (was 6). Limit kept at 60/min/IP (see decision 7). |
| S-01 | MED | **Fixed, Task 2; CSP enforced in the production template, Task 14.** |
| S-02 | MED | **Fixed, Task 3.** No proxy is trusted by default; `TRUSTED_PROXIES` opts in. Also closed a related, previously unreported hole: with `trustProxies` unset the framework trusted every proxy for a client-controlled `*.on-forge.com`/`*.on-vapor.com` Host, letting a client forge `X-Forwarded-For` and bypass every IP limiter. |
| S-03 | MED | **Fixed, Task 1.** `php artisan app:preflight [--strict]`, tracked `.env.production.example`. |
| S-04 | MED | **Fixed, Task 5.** Deletion is refused (409, naming the blockers) for every kind of reference, including archived owners. |
| S-05 | MED | **Fixed, Task 5.** 28 MP / 12 000 px ceilings (`MEDIA_MAX_PIXELS`, `MEDIA_MAX_EDGE`) are checked from the file header before any decode; 422 instead of a fatal 500. |
| P-03 | MED | **Fixed, Task 9.** HTTP validators (`Cache-Control` + strong `ETag`, 304) on public API GETs; application cache for site settings, navigation, homepage and sitemap; invalidated on every admin write (route-walk test). |
| P-04 | MED | **Fixed, Task 12.** gzip, immutable caching of hashed `/build/assets`, 1-day `/storage` caching. |
| S-06 | LOW | **Fixed, Task 4.** Array-valued admin filters answer 422 (also `locale[]`, found while probing). |
| S-07 | LOW | **Fixed, Task 4.** Login field bounds; new/changed passwords need 12+ characters (decision 6). |
| S-08 | LOW | **Fixed, Task 4.** `App\Rules\Slug`; a record's own existing slugs stay valid. |
| S-09 | LOW | **Fixed, Task 10.** Notification is sent after the response (`->afterResponse()`); `MAIL_TIMEOUT`. Verified in Task 14: response in 22 ms while an unreachable SMTP host costs its 3 s timeout only after the response. |
| S-10 | LOW | **Fixed, Task 1.** Test user only created in `local`/`testing`; preflight flags an existing one. |
| S-11 | LOW | **Fixed, Tasks 1 + 12.** `server_tokens off`; `expose_php = Off` (applies on an image rebuild — verified: no `X-Powered-By` after `docker compose build app`). |
| S-12 | LOW | **Fixed, Task 3.** |
| S-13 | LOW | **Fixed, Task 1** (templates: `LOG_STACK=daily`, `LOG_LEVEL=warning`). |
| S-14 | LOW | **Fixed, Task 4.** |
| S-15 | LOW | **Adopted for new uploads, Task 5** (deviates from the "accept" default): new public variants use an unguessable per-media path. Variants uploaded before Phase 12 keep their `media/{id}/…` paths (a public gallery; accepted). |
| S-16 | LOW | **Fixed, Task 5.** |
| S-17 | LOW | **Fixed, Task 7.** `admin-api` limiter, 240 writes/min/user. |
| P-05 | LOW | **Measured, no query/contract change, Task 11.** No N+1; only an `(is_active, sort_order)` index was added. At 5 000 artworks the cold homepage (~1.1 s, cached 60 s), `/artists` (~0.4 s) and cold sitemap (~0.43 s, cached 10 min) exceed 200 ms because of contract-mandated Eloquent hydration; restricting it would not reach the target without a contract change. **Deferred** (needs pagination = an API contract change, out of scope). |
| P-06 | LOW | **Fixed, Task 8.** |
| P-07 | LOW | **Fixed, Task 11; canonical URLs aligned in Task 14.** The sitemap percent-encodes each segment. `PublicPageSeoResolver` built canonical/`og:url`/JSON-LD URLs from raw slugs and inventory codes, so they disagreed with the sitemap for Unicode slugs and for codes with a space, `?` or `#` (codes are only `string max:50`). Fixed with one shared encoder (`SeoText::segmentsUrl`), output unchanged for unreserved characters; regression tests assert canonical == sitemap `<loc>`. |
| P-08 | LOW | **Fixed, Task 7** (TTL-native file store). |
| I-01 | INFO | **Deferred.** No conflicting data; needs a decision on locale-scoped slug lookup. |
| I-02 | INFO | **Fixed, Task 4** (reserved-slug rule). |
| I-03 | INFO | **Fixed, Task 4** (`LIKE` wildcards escaped). |
| I-04 | INFO | **Accepted.** Intentional for enquiry triage; note for any privacy review. |
| I-05 | INFO | **Fixed, Task 13.** `laravel/framework` 13.31.0 → 13.32.0 and `league/commonmark` 2.10.1 → 2.10.3. **Deferred:** PHPUnit 13 (major) and jsdom 30.1.0 (dev-only, no advisory). |
| I-06 | INFO | **Deferred.** Login timing was not evaluated (message parity is tested). |
| I-07 | INFO | **Fixed, Task 0.** Lazy loading is prevented outside production and fails the test suite. |
| I-08 | INFO | **Fixed, Task 4.** |

### CSP decision: enforced (production template), report-only for local development

Every public route type (home, catalogue, artwork detail with a YouTube embed, artists, exhibitions, articles, a CMS
page, contact including a failed submission, an unknown page, locale switch) and every admin screen (login, all 13
screens, the artwork editor with its YouTube preview) were loaded in headless Chrome twice: with the policy exactly as
served (`Content-Security-Policy-Report-Only`) and with the same header promoted to an enforcing
`Content-Security-Policy` plus `frame-ancestors 'self'`. Result: **0 violations in both runs**, no broken images, the
YouTube iframes present, every API call succeeding. A negative control on the same setup proved the check is not
vacuous (an inline script, an inline `style` attribute, a foreign image and a foreign `fetch` were reported in
report-only and blocked when enforced). No `'unsafe-inline'`/`'unsafe-eval'` was added and none is needed.
`.env.production.example` therefore sets `SECURITY_CSP=enforce`; `.env.example` keeps `report-only`. Rollback is one
environment variable. Notes: the public shell and admin SPA load no fonts, third-party scripts or inline code; the
console warnings seen on pages with a YouTube embed (`Unrecognized feature: 'web-share'`, `No available adapters`)
come from YouTube's own player, not from the policy. Laravel's built-in HTML error pages (only reachable for
non-JSON, non-shell requests) carry inline styles and render unstyled under an enforced policy; their content and
status are unaffected.

### Open decisions — outcome

1. Deployment topology: same-origin SPA (unchanged); CORS grants no origin in production.
2. CSP: enforce (above).
3. Public media URL obscurity (S-15): adopted for new uploads in Task 5 (the plan's default was "accept").
4. Production cache/session/limiter backend: the limiter defaults to `file`; the code works on `file`/`database`; Redis is a Phase 13 item.
5. Public API cache TTL: 60 s (`PUBLIC_API_CACHE_TTL`, `0` disables); `stale-while-revalidate` is opt-in (default 0).
6. Password policy: stricter than planned — 12+ characters with letters and numbers, max 255; existing passwords are not re-validated.
7. Public API limit: kept at 60/min/IP (not raised to 120); the frontend now makes half the shell requests and the limiter is cheap, so the limit can be raised with `RATE_LIMIT_PUBLIC_API` if traffic shows a need.

### Measurement targets — after-state

| Metric | Before | After |
|---|---|---|
| `Set-Cookie` on public HTML | 2 cookies | 0 |
| `sessions` queries per public page view | 3 | 0 |
| Limiter SQL per public API request | 6 | 0 |
| Shell API requests per hard load | 6 (+page) | 3 (+page) — observed in the browser |
| `GET /api/v1/site-settings` data SQL, warm | 3 | 2 with the dev `database` cache store (version + payload read), 0 with a `file` store |
| Security headers on 200/404/422/500 | 2 (nginx, 200 only) | 5 static + CSP, on every status incl. 401/404/405/422/429 |
| gzip on HTML/JSON/JS/CSS/XML | none | yes; `/build/assets` immutable; no `Server` version, no `X-Powered-By` |
| Admin list `?search[]=` | 500 | 422 |
| Media delete of a referenced file | allowed | 409 |
| Over-limit-pixel upload | fatal 500 | 422 |
| Public query counts (dev DB, warm) | homepage 27, artworks 18, artwork detail 21, page 10, `/` 10, sitemap 9 | homepage 2, artworks 12, artwork detail 14, page 4, `/` 6, sitemap 2 (cold: 23/12/14/4/6/11); constant across dataset size (`PublicApiQueryCountTest`) |

### Deferred / Phase 13 hand-off

Redis (shared cache, limiter and queue) and queue workers/retries for the enquiry notification; TLS termination, HSTS
enablement (`SECURITY_HSTS=true`) and `TRUSTED_PROXIES` for the real proxy/CDN; CDN caching TTLs and `gzip_proxied`;
brotli; log shipping and monitoring; backups; the `s3` disk (the CSP media origin follows the public disk's URL);
a WAF; rebuilding the app image so `expose_php = Off` applies; optionally a `SECURITY_CSP_REPORT_URI` collector and a
preflight warning when production does not enforce the CSP. Not done in Phase 12 by design: pagination of the
documented-unpaginated homepage/artists payloads (P-05), locale-scoped page slug lookup (I-01), login-timing review
(I-06), PHPUnit 13 and the jsdom minor.
