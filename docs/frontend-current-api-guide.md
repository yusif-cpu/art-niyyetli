# ArtNiyyətli — Public Frontend & API Guide (current state)

> **Audience:** the frontend developer building and maintaining the public website.
> **Describes:** the repository at the end of **Phase 12** (performance + security hardening), commit **`88e5407`** (`chore: finalize phase 12 security hardening`), on the `main` and `frontend` branches, **updated for commits `b2bab8d`** (`feat: extend public artwork filters and lookup api`: genre/medium lists, size filter, `price_max` fix, artist AZ-slug invariant, homepage wall cap) **and `2c64176`** (`fix: resolve homepage sections by key`). It replaces the earlier version of this file, which described commit `b638e80`.
> **Source of truth:** the code in this repository. Every statement below was checked against routes, controllers, resources, requests, services, models, enums, config, the public frontend under `resources/js/public/`, the tests, and live calls against the Docker stack at `http://localhost:8080`. Where something could **not** be determined from the repository it is listed in [§21](#21-things-that-could-not-be-determined-from-the-repository); features that do not exist are listed in [§26](#26-out-of-scope-what-does-not-exist).
> **Example data** in this document is fictional. Field names, key order, types and behaviours are real. Example media URLs show the `/storage/media/10/catalogue-webp.webp` shape of older uploads; new uploads have an extra random path segment (see [§11](#11-images-media-urls-and-variants)) — always treat URLs as opaque.
> **No secrets:** this guide lists environment-variable *names* and code defaults only; it contains no `.env` values.

---

## Table of contents

**Start here**

- [A. Frontend developer workflow](#a-frontend-developer-workflow)
- [B. Local setup, Docker and startup](#b-local-setup-docker-and-startup)
- [C. Environment variables](#c-environment-variables)

**Reference**

1. [Mental model & quick start](#1-mental-model--quick-start)
2. [General API conventions](#2-general-api-conventions)
3. [Locale handling (AZ / EN)](#3-locale-handling-az--en)
4. [Pagination](#4-pagination)
5. [Errors, states and rate limits](#5-errors-states-and-rate-limits)
6. [Endpoint index (19 endpoints)](#6-endpoint-index-19-endpoints)
7. [Endpoint reference](#7-endpoint-reference)
   - [E1 `GET /navigation`](#e1-get-navigation)
   - [E2 `GET /homepage`](#e2-get-homepage)
   - [E3 `GET /pages`](#e3-get-pages)
   - [E4 `GET /pages/{slug}`](#e4-get-pagesslug)
   - [E5 `GET /artists`](#e5-get-artists)
   - [E6 `GET /artists/{slug}`](#e6-get-artistsslug)
   - [E7 `GET /artworks`](#e7-get-artworks)
   - [E8 `GET /artworks/{inventoryCode}`](#e8-get-artworksinventorycode)
   - [E9 `GET /exhibitions`](#e9-get-exhibitions)
   - [E10 `GET /exhibitions/{slug}`](#e10-get-exhibitionsslug)
   - [E11 `GET /articles`](#e11-get-articles)
   - [E12 `GET /articles/{slug}`](#e12-get-articlesslug)
   - [E13 `GET /faqs`](#e13-get-faqs)
   - [E14 `GET /site-settings`](#e14-get-site-settings)
   - [E15 `GET /social-links`](#e15-get-social-links)
   - [E16 `GET /enquiry-subjects`](#e16-get-enquiry-subjects)
   - [E17 `POST /enquiries`](#e17-post-enquiries)
   - [E18 `GET /genres`](#e18-get-genres)
   - [E19 `GET /mediums`](#e19-get-mediums)
8. [Navigation in depth](#8-navigation-in-depth)
9. [Branding (logo, brand text, display mode)](#9-branding-logo-brand-text-display-mode)
10. [Social media links](#10-social-media-links)
11. [Images, media URLs and variants](#11-images-media-urls-and-variants)
12. [YouTube video](#12-youtube-video)
13. [WhatsApp behaviour](#13-whatsapp-behaviour)
14. [Artwork availability, price and enquiry behaviour](#14-artwork-availability-price-and-enquiry-behaviour)
15. [Contact form and artwork enquiry form](#15-contact-form-and-artwork-enquiry-form)
16. [SEO and page metadata](#16-seo-and-page-metadata)
17. [Public routes and URL structure](#17-public-routes-and-url-structure)
18. [What must be data-driven vs. what the frontend owns](#18-what-must-be-data-driven-vs-what-the-frontend-owns)
19. [Existing frontend architecture and patterns to follow](#19-existing-frontend-architecture-and-patterns-to-follow)
20. [Enum reference](#20-enum-reference)
21. [Things that could not be determined from the repository](#21-things-that-could-not-be-determined-from-the-repository)
22. [Known gaps and gotchas in the current implementation](#22-known-gaps-and-gotchas-in-the-current-implementation)
23. [Authentication boundary: public API vs admin API](#23-authentication-boundary-public-api-vs-admin-api)
24. [HTTP caching, cookies, security headers and CSP](#24-http-caching-cookies-security-headers-and-csp)
25. [Production build and deployment notes](#25-production-build-and-deployment-notes)
26. [Out of scope: what does not exist](#26-out-of-scope-what-does-not-exist)
27. [Appendix: curl cheat sheet](#27-appendix-curl-cheat-sheet)

---

## A. Frontend developer workflow

1. **Work from the `frontend` branch.** It was created from the Phase 12 tip (`88e5407`) and is the integration branch for public-UI work.
   ```bash
   git fetch origin
   git switch frontend            # first time: git switch --track origin/frontend
   ```
2. **Do not develop directly on `main`.** `main` is the backend/Phase line. Frontend work reaches `main` only through an explicit merge that the project owner requests.
3. **Pull the latest `origin/frontend` before starting** each session (and before pushing):
   ```bash
   git pull --ff-only origin frontend
   ```
4. **Keep changes to the public UI.** Your area is `resources/js/public/` (components, pages, layout, services, i18n, tests), `resources/css/public.css`, and — only when needed for the shell — `resources/views/public.blade.php`. **Do not change** the API (routes, controllers, resources, requests, services, config, migrations), the admin SPA (`resources/js/admin/`, `resources/css/admin.css`, `resources/views/admin.blade.php`), Docker/nginx files, or `.env*` templates unless the change is **explicitly coordinated** with the backend owner. If the UI needs a field or endpoint that does not exist ([§26](#26-out-of-scope-what-does-not-exist)), ask for it — do not work around it by editing backend code.
5. **Run the tests and the production build before every commit:**
   ```bash
   npm test          # full Vitest suite (jsdom)
   npm run build     # production Vite build must succeed
   ```
   If your change touches anything served by Laravel, also run `docker compose exec app php artisan test` and `docker compose exec app vendor/bin/pint --test`.
6. **Commit with clear, scoped messages**, one logical change per commit, e.g. `feat(public): add genre filter to the catalogue` or `fix(public): encode artwork codes in links`. Do not commit build output (`public/build` is git-ignored), `node_modules`, or `.env`.
7. **Do not modify `work-files/`.** It holds project reference material (requirements, design references), is git-ignored, and must stay untouched.

Also never commit secrets, and do not edit files outside your area "to make something work" — raise it instead.

---

## B. Local setup, Docker and startup

**Prerequisites:** Docker with Compose v2, Git, and Node.js + npm **on the host** (the Docker images contain PHP/nginx/MySQL only — there is no Node inside them, so `npm` runs on your machine). This guide was verified with Node 22.22.1 / npm 9.2.0; `package.json` declares no `engines`, so a current Node LTS that Vite 8 supports is expected.

**Stack:** React 19, Vite 8, Tailwind CSS v4, Vitest 5 (`package.json`). Laravel 13 / PHP 8.4 backend.

**First-time setup** (the README's backend steps, verified against `docker-compose.yml`):

```bash
cp .env.example .env
# edit .env: set DB_PASSWORD and MYSQL_ROOT_PASSWORD to your own local values (the example ships placeholders)

docker compose up -d --build
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed      # roles, enquiry subjects, CMS pages (+ dev admin if ADMIN_DEV_* are set)

npm ci                                           # on the host; .npmrc sets ignore-scripts=true
npm run build                                    # or `npm run dev`, see below
```

Then open **http://localhost:8080** (public site) and **http://localhost:8080/admin** (admin SPA).

| Service | What | Access |
|---|---|---|
| `webserver` (`art-niyyetli-webserver`) | nginx 1.27, serves `public/` and proxies PHP | `http://localhost:8080` |
| `app` (`art-niyyetli-app`) | PHP-FPM 8.4 (also where you run `artisan`/`composer`) | internal, port 9000 |
| `mysql` (`art-niyyetli-mysql`) | MySQL 8.4, persistent volume | `localhost:3306` |

**Frontend development loop**

- **Build once (no HMR):** `npm run build` writes `public/build/` (git-ignored). The Laravel Blade shell reads `public/build/manifest.json`; **if neither a build nor the dev server exists, the shell cannot load its assets.** Rebuild after each change.
- **Vite dev server (HMR):** `npm run dev`. While it runs, Vite writes `public/hot` and the shell loads scripts/styles from the dev server. The application deliberately **does not send the Content-Security-Policy header while `public/hot` exists** (Vite needs inline/HMR allowances). Delete a stale `public/hot` if the dev server crashed. Whether the dev server is reachable from a Windows browser when Node runs in WSL was **not verified** here.
- **Always test against `http://localhost:8080`**, not the Vite port: the SPA calls the API with relative URLs, so the page origin must be the Laravel origin.
- **Tests:** `npm test` runs the whole Vitest suite. This checkout has **314 Vitest tests in 62 files** when `.claude/**` is excluded (at `2c64176`; about 1 minute). If a stale git worktree exists under `.claude/worktrees/` (e.g. `subject-driven-enquiries`), plain `npm test` also discovers its duplicate copies of the specs (~212 extra tests — **about 526 in total**); that is repository noise, not your code. Exclude it with `npx vitest run --exclude '**/node_modules/**' --exclude '.claude/**'` (passing `--exclude` replaces Vitest's defaults, so keep `node_modules`). The equivalent permanent setting is `test.exclude: [...configDefaults.exclude, '.claude/**']` in `vite.config.js` (`configDefaults` from `vitest/config`); it is **not applied yet** — the config has no `exclude`. One file: `npx vitest run resources/js/public/__tests__/<name>.test.jsx`.
- **Backend (only when coordinated):** `docker compose exec app php artisan test` (1131 PHPUnit tests at `b2bab8d`), `docker compose exec app vendor/bin/pint --test`.
- **Laravel Boost is not a project dependency.** It is not in `composer.json` / `composer.lock`, and you should **not** install it (`composer require laravel/boost` / `php artisan boost:install`). The "install Laravel Boost" block at the top of `AGENTS.md` / `CLAUDE.md` is generic bootstrap boilerplate from the initial commit; ignore it for this project.

**Getting data to work with.** `db:seed` creates the CMS pages, the six enquiry subjects, roles and (if configured) a dev administrator — it does **not** create artists, artworks, exhibitions or articles. Create those in the admin at `/admin` (the dev administrator is created from the `ADMIN_DEV_USERNAME` / `ADMIN_DEV_EMAIL` / `ADMIN_DEV_PASSWORD` variables of your local `.env`; the account created by `DatabaseSeeder` for `test@example.com` has no role and **cannot** sign in to the admin). `BenchmarkSeeder` builds bulk data but is additive and meant for scratch databases — do not run it against your development database. Expect sparse or odd data (e.g. the dev database has artists without a translation — the public artist list now hides them, see [E5](#e5-get-artists)); the UI must cope ([§22](#22-known-gaps-and-gotchas-in-the-current-implementation)).

**Caching while you develop.** Public API `GET` responses are cacheable for **60 seconds** by the browser (`Cache-Control: public, max-age=60`), and the server also caches site settings, navigation, homepage and sitemap (60–600 s) — see [§24](#24-http-caching-cookies-security-headers-and-csp). Saving in the admin invalidates the server-side cache immediately, but a browser may keep an earlier response for up to 60 s: hard-reload or tick *Disable cache* in DevTools. After changing the database outside the admin run `docker compose exec app php artisan public-cache:flush`.

**Rate limit while you develop.** 60 requests/minute/IP on `/api/v1/*` (5 enquiries/hour/IP). If you hit `429` locally, wait a minute, or reset the counters (dev only; this clears the whole `file` cache store, which holds only limiter counters in the default setup): `docker compose exec app php artisan cache:clear file`.

**Container housekeeping**

```bash
docker compose ps
docker compose logs -f app            # PHP errors
docker compose exec app php artisan route:list --path=api
docker compose down                   # stop (keeps the database)
docker compose down -v                # stop AND delete the database volume
```

- After recreating the `app` container, nginx may answer `502` until it re-resolves the upstream: `docker compose exec webserver nginx -s reload`.
- Changes to `docker/php/conf.d/local.ini` apply only after `docker compose up -d --build` (the file is copied into the image, not mounted). `docker/nginx/default.conf` is mounted read-only; reload nginx after editing it.
- Handy URLs: `/` (shell), `/admin`, `/api/v1/...`, `/robots.txt`, `/sitemap.xml`, `/up` (framework health check).
- The README's introductory paragraph still says only the "Phase 01 foundation" exists; that text is stale. This guide describes the current state.

---

## C. Environment variables

**The public SPA reads no environment variables**: nothing under `resources/js/public/` or the shell view uses `import.meta.env` / `VITE_*` (verified by search), and the API base is the relative path `/api/v1`. What a frontend developer does need to know is which **server-side** variables change the data or headers the SPA receives. Names and code defaults only (values live in each developer's untracked `.env`):

| Variable | Default in code | Effect visible to the frontend |
|---|---|---|
| `APP_URL` | `http://localhost` | Host of every **media URL** (`{APP_URL}/storage/...`), and of canonical/`og:*`/sitemap URLs. Must equal the origin you browse (`http://localhost:8080` locally) or images point at the wrong host. |
| `APP_TIMEZONE` | (Laravel default) | UTC offset inside `published_at` on articles. |
| `GALLERY_CURRENCY` | `AZN` | `currency` on artwork cards (when the price is shown). |
| `GALLERY_WHATSAPP_NUMBER` | none | Fallback number for `whatsapp_link` when the admin setting has no usable number. |
| `GALLERY_WALL_LIMIT` | `16` | Server-side cap on `wall` in `GET /homepage` ([E2](#e2-get-homepage)). Not a query parameter. |
| `ALLOW_SOLD_ENQUIRIES` | `false` | When `false`, enquiries for **sold** artworks are rejected (`422`). Not exposed by the API. |
| `ENQUIRY_NOTIFICATION_EMAIL` | none | Fallback recipient for the notification e-mail (server-side only). |
| `PUBLIC_API_CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173` outside production; **empty in production** | Cross-origin browsers only; irrelevant to the same-origin SPA. |
| `PUBLIC_API_CORS_ALLOW_POST` | `false` | Adds `POST` to the cross-origin allow-list (needed only by a separately hosted frontend submitting enquiries). |
| `RATE_LIMIT_PUBLIC_API` | `60` | Requests/minute/IP on `/api/v1`. Empty/zero/non-numeric → 60. |
| `PUBLIC_API_CACHE_TTL` | `60` | `max-age` seconds on public API GETs; `0` turns HTTP caching off. |
| `PUBLIC_API_CACHE_SWR` | `0` | Adds `stale-while-revalidate=N` when > 0. |
| `SECURITY_CSP` | `report-only` | `off` \| `report-only` \| `enforce`. Local `.env.example` uses `report-only`; **`.env.production.example` uses `enforce`**. See [§24](#24-http-caching-cookies-security-headers-and-csp). |
| `SECURITY_HSTS` | `false` | `Strict-Transport-Security` on HTTPS responses only. |
| `TRUSTED_PROXIES` | empty | Which reverse proxies' `X-Forwarded-*` headers are trusted (client IP for rate limiting, HTTPS detection). |
| `MEDIA_PUBLIC_DISK` | `public` | Storage disk that serves image variants (a CDN/S3 disk changes the media host). |

There is also a `VITE_APP_NAME` entry in `.env.example`; nothing reads it.

---

## 1. Mental model & quick start

- The public website is a **React single-page app served by Laravel**. Laravel renders one Blade view (`resources/views/public.blade.php`) for every non-admin, non-API path; that view computes the SEO `<head>` server-side and mounts the SPA into `<div id="public-root">`. Entry point: `resources/js/public/main.jsx`.
- The SPA calls the JSON API **same-origin with relative URLs**: `/api/v1/...`. There is no configurable API base URL in the code.
- The API is **read-only** except for exactly one write endpoint, `POST /api/v1/enquiries`.
- There is **no authentication, no cookies and no CSRF token** on the public site or the public API. Since Phase 12 the public HTML shell, `robots.txt`, `sitemap.xml` and every `/api/v1` response are served **without a session and without `Set-Cookie`** (verified). The existing SPA sends only `Accept: application/json` (and `Content-Type: application/json` for the POST).
- Local Docker stack: nginx on **`http://localhost:8080`** (containers `art-niyyetli-app`, `art-niyyetli-webserver`, `art-niyyetli-mysql`). So the dev API base is `http://localhost:8080/api/v1`. Setup: [B](#b-local-setup-docker-and-startup).
- Build / test commands (from `package.json`): `npm run dev` (Vite), `npm run build` (Vite production build), `npm test` (Vitest, jsdom).
- On every page load the SPA first requests the **3 shell endpoints** (`/navigation`, `/site-settings`, `/social-links`, once per locale, shared by Header and Footer) plus the page's own data.

Minimal call:

```js
const res = await fetch('/api/v1/artworks?locale=en&page=1', { headers: { Accept: 'application/json' } });
const body = await res.json(); // { data: [...], links: {...}, meta: {...} }
```

Prefer the existing client (`resources/js/public/lib/api.js`, see [§19](#19-existing-frontend-architecture-and-patterns-to-follow)) instead of raw `fetch`.

---

## 2. General API conventions

| Topic | Behaviour |
|---|---|
| Base path | `/api/v1` (routes are defined in `routes/api.php` inside `Route::prefix('v1')`). |
| Format | JSON in / JSON out. Errors are JSON for every `/api/*` request. |
| Methods | 16 × `GET`, 1 × `POST` (`/enquiries`). Any other method on a GET route → `405` with `Allow: GET, HEAD`. |
| Envelope | Single object → `{ "data": {...} }`. List → `{ "data": [...] }`. Paginated list → `{ "data": [...], "links": {...}, "meta": {...} }`. `/navigation`, `/site-settings` and `/homepage` return custom (non-model) objects, but still wrap everything in `data`. |
| Auth | None. Admin routes (`/admin/*`) are a separate system and are not part of the public API. |
| CORS | `config/cors.php`: paths `api/*`, allowed methods `GET, HEAD, OPTIONS` (plus `POST` **only** when env `PUBLIC_API_CORS_ALLOW_POST=true`), allowed request headers `Accept, Content-Type, X-Requested-With`, preflight cached 600 s, no credentials, no wildcard. Allowed origins come from `PUBLIC_API_CORS_ORIGINS`: the localhost dev origins (`:3000`, `:5173`) outside production, **none in production**. Same-origin (the current SPA) is unaffected. See [§22](#22-known-gaps-and-gotchas-in-the-current-implementation). |
| Media URLs | Always **absolute** URLs (e.g. `http://localhost:8080/storage/media/10/catalogue-webp.webp`). Never build them yourself — see [§11](#11-images-media-urls-and-variants). |
| Numbers | `price`, `width_cm`, `height_cm` are JSON numbers (floats). Counts and ids are integers. |
| Dates | Exhibition `start_date` / `end_date`: `YYYY-MM-DD`. Article `published_at`: ISO 8601 **with UTC offset** (offset follows the server's `APP_TIMEZONE`). Parse with `new Date(...)`. |
| Unknown params | Ignored (no error), except `POST /enquiries` which rejects unknown body/query keys. Non-scalar values (e.g. `artist[]=1`) for a **validated** param → `422`; for an unvalidated one (`per_page[]=5`, `page[]=2`) they are ignored/normalised. |
| Rate limit | 60 requests / minute / IP on everything under `/api/v1` (env `RATE_LIMIT_PUBLIC_API`); plus 5 / hour / IP on `POST /enquiries`. See [§5](#5-errors-states-and-rate-limits). |
| Caching | Successful `GET`s carry `Cache-Control: public, max-age=60` and a strong `ETag` (conditional requests → `304`). Errors and `POST` are never cacheable. See [§24](#24-http-caching-cookies-security-headers-and-csp). |
| Response headers | Every response carries `X-RateLimit-Limit` and `X-RateLimit-Remaining`; every response (including errors) carries the security headers of [§24](#24-http-caching-cookies-security-headers-and-csp). |

### Null vs. empty string

- Localized text fields are `null` when no usable value exists in the requested locale **or** in the AZ fallback (empty strings count as missing).
- `site-settings` values: a setting that was **never saved** is `null`; a setting that an admin saved and later **cleared** is `""` (empty string). Treat both as "empty" with a falsy check.
- `artist.name` (in artwork / exhibition objects) is built as `trim(first_name + ' ' + last_name)`, so it can be `""` (not `null`) when both names are missing.

### Draft / inactive / deleted content

The API only exposes content that is **active** and **not soft-deleted**. Anything else behaves as "does not exist": it is absent from lists and returns `404` on its detail URL. Articles additionally need `status = published` and `published_at <= now` (see [E11](#e11-get-articles)).

---

## 3. Locale handling (AZ / EN)

**Supported locales:** `az` (default) and `en` — enum `App\Enums\Locale`.

### How to pick a locale

- Pass **`?locale=az`** or **`?locale=en`** on the request URL.
- Missing, empty, unsupported (e.g. `fr`), or non-string (e.g. `locale[]=en`) → **`az`**. This never errors.
- `Accept-Language` is **not** read. The locale is **not** part of the URL path.
- The existing SPA keeps the choice in React context + `localStorage` key `public-locale` (`'az'` | `'en'`, default `'az'`) and passes it to every service call. It does **not** put the locale in the page URL.

### Fallback rules (field-level, not row-level)

Implemented in `App\Support\Api\LocalizedFields`. Each localized field is resolved **independently**:

| Requested | Resolution for each field |
|---|---|
| `az` | AZ value. **EN is never used.** Empty/missing → `null`. |
| `en` | EN value if non-empty; else the AZ value; else `null`. |

So an English page can legitimately mix English and Azerbaijani strings, and a field can be `null` even for `az` if the AZ translation is empty.

### Which fields are localized

| Resource | Localized fields |
|---|---|
| Page | `slug`, `title`, `content`; section `heading`, `body` |
| Navigation (page items) | `title`, and the slug inside `href` |
| Artist | `slug`, `first_name`, `last_name`, `birth_place`, `direction`, `biography`, `artistic_approach`; artist exhibitions: `title`, `venue`; awards: `title` |
| Artwork | `title` (cards), `short_description`, `provenance` (detail); genre `name`; medium `name`; artist name parts |
| Exhibition | `slug`, `title`, `venue`, `short_text`, `full_text`; participating artists' `slug` + name |
| Article | `slug`, `title`, `short_text`, `content` |
| FAQ | `question`, `answer` |
| Enquiry subject | `label` |

### Not localized (locale param has no effect)

- `GET /site-settings` (incl. `brand_text`, `footer_text`, `address`, `opening_hours`) and `GET /social-links` (incl. `platform`) — single-language values entered by admins.
- Artwork `certificate`, `frame_condition`, `delivery_note` (single-language text).
- The `whatsapp_link` pre-filled message is always Azerbaijani (see [§13](#13-whatsapp-behaviour)).
- Success message of `POST /enquiries` is always Azerbaijani (`"Sorğunuz qeydə alındı."`).
- Validation error **messages** are Laravel's English defaults (app locale is `en`) regardless of `?locale`.
- Enum values, `inventory_code`, prices, dates, URLs.

### Slug lookups are locale-agnostic

Detail endpoints that take a `slug` (`/pages`, `/artists`, `/exhibitions`, `/articles`) look the slug up **across all locales**. `GET /artists/leyla-mammadova?locale=en` works even if `leyla-mammadova` is the AZ slug. The `slug` in the **response** is the one for the requested locale (with AZ fallback). The current SPA does **not** rewrite the URL when the user switches locale; it simply re-fetches the same slug with the new `?locale`.

### UI strings

Static UI text lives in `resources/js/public/i18n/dictionary.js` (`az` / `en`). `t(locale, 'nav.artworks')` falls back to `az`, then to the raw key path. Anything in the dictionary is frontend-owned; anything from the API is data-driven ([§18](#18-what-must-be-data-driven-vs-what-the-frontend-owns)).

---

## 4. Pagination

Only **three** endpoints paginate: `GET /artworks`, `GET /exhibitions`, `GET /articles`. All others return the full set.

| Param | Meaning |
|---|---|
| `page` | 1-based page number (Laravel default). Non-numeric / `0` is normalised to page 1. A page **past the last** returns `200` with `"data": []` (and `meta.current_page` = requested page). |
| `per_page` | Default **24**, allowed **1–60**. Anything else (`0`, `-1`, `61`, `999`, `abc`, `per_page[]=5`) silently becomes **24** — it is *not* clamped to 60. |

Response shape (real output; `links` URLs preserve your query string):

```json
{
  "data": [ /* items */ ],
  "links": {
    "first": "http://localhost:8080/api/v1/artworks?per_page=2&page=1",
    "last":  "http://localhost:8080/api/v1/artworks?per_page=2&page=1",
    "prev":  null,
    "next":  null
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 1,
    "links": [
      { "url": null, "label": "&laquo; Previous", "page": null, "active": false },
      { "url": "http://localhost:8080/api/v1/artworks?per_page=2&page=1", "label": "1", "page": 1, "active": true },
      { "url": null, "label": "Next &raquo;", "page": null, "active": false }
    ],
    "path": "http://localhost:8080/api/v1/artworks",
    "per_page": 2,
    "to": 1,
    "total": 1
  }
}
```

- `meta.from` / `meta.to` are `null` when `data` is empty.
- `meta.links[].label` contains HTML entities (`&laquo;`) — **do not render these labels**; build your own pager from `current_page` / `last_page` / `total`. The existing `Pagination` component does exactly this.
- The existing SPA hides the pager when `last_page <= 1` and keeps `page` in component state, **not** in the URL.

---

## 5. Errors, states and rate limits

### Status codes you will see

| Status | When | Body |
|---|---|---|
| `200` | Successful `GET`. | Resource envelope. |
| `201` | `POST /enquiries` accepted (also the honeypot fake-success). | `{ "message": "Sorğunuz qeydə alındı." }` |
| `404` | Unknown / inactive / soft-deleted / unpublished entity on a detail endpoint; unknown `/api/*` path. | `{ "message": "" }` in production mode (`APP_DEBUG=false`). With `APP_DEBUG=true` (local Docker) the body additionally contains `exception`, `file`, `line`, `trace` — **never depend on any of it, and never rely on `message` for 404s.** |
| `405` | Wrong method (e.g. `POST /artworks`). | JSON, header `Allow: GET, HEAD`. |
| `422` | Invalid query params (`/artworks`, `/exhibitions`) or invalid enquiry body. | `{ "message": "...", "errors": { "<field>": ["..."] } }` |
| `429` | Rate limit exceeded. | `{ "message": "Too Many Attempts." }` plus `Retry-After: <seconds>` header (verified: 60 when the per-minute limit trips). |

### 422 examples (real output)

`GET /api/v1/artworks?status=bogus`

```json
{
  "message": "The selected status is invalid.",
  "errors": { "status": ["The selected status is invalid."] }
}
```

`GET /api/v1/exhibitions?filter=bogus`

```json
{
  "message": "The selected filter is invalid.",
  "errors": { "filter": ["The selected filter is invalid."] }
}
```

For several errors Laravel's `message` is `"<first message> (and N more errors)"`. **Key your UI on `errors.<field>[0]` and on field names, not on message text** (messages are English defaults and can change).

### Rate limits (`app/Providers/AppServiceProvider.php`, values in `config/security.php`)

| Limiter | Applies to | Limit |
|---|---|---|
| `public-api` | every route under `/api/v1` (including the POST) | **60 / minute / IP** (env `RATE_LIMIT_PUBLIC_API`) |
| `enquiry-submission` | `POST /api/v1/enquiries` only (in addition to the above) | **5 / hour / IP** (fixed in code, not an env setting) |

- The 5/hour counter counts **every** POST attempt from that IP, including ones that fail validation.
- The limiter counts per **client IP**. Behind a reverse proxy the real client IP is used only if the operator configured `TRUSTED_PROXIES`; a client-supplied `X-Forwarded-For` is otherwise ignored (verified). Cross-origin/other clients therefore cannot reset their budget by spoofing it.
- Counters live in the `file` cache store (no database work per request). Every response shows `X-RateLimit-Limit` / `X-RateLimit-Remaining`; on `429` read `Retry-After` (seconds). The existing `PublicApiError` exposes `isRateLimited === true` for status `429`.
- **Request budget:** since Phase 12 the SPA shell fetches `navigation`, `site-settings` and `social-links` **once per locale** (a shared `SiteDataProvider`), i.e. **3 shell requests** per hard load and 3 per locale switch, plus the page's own calls (e.g. `/` → +`homepage`; `/artworks` → +`artists` +`artworks`; an artwork detail → +1). Browsers also reuse cached `GET`s for 60 s ([§24](#24-http-caching-cookies-security-headers-and-csp)), so normal browsing stays far below 60/min; a page that fires many parallel requests (or a catalogue with rapid filter changes) can still approach it — keep request counts low and never poll.

### Recommended handling per state (and what exists today)

| State | Signal | Existing SPA behaviour | Notes |
|---|---|---|---|
| Loading | `useApiData` → `loading: true` (initial state is `true`) | `LoadingState` (`t('common.loading')`) | While loading, list pages hide the previous results and show only the loading text; there are no skeletons. |
| Empty list | `data.length === 0` | `EmptyState` (`t('common.empty')`) | Also the result of a filter with no matches, or a page past the end. |
| Error (network / 5xx) | `error` set, `status` other than 404/422/429 | `ErrorState` (`t('common.error')`), optional retry (`onRetry`) | Catalogue wires a retry token. |
| 404 on a detail page | `error.status === 404` | `NotFoundPage` (sets `noindex`) | Artwork, artist, exhibition, article, static page. |
| 422 (form) | `PublicApiError.errors` | `EnquiryForm` shows `errors.name/email/message[0]` under the fields and `error.message` in a banner | `phone`, `subject`, `artwork_code` errors are **not** rendered individually (see [§22](#22-known-gaps-and-gotchas-in-the-current-implementation)). |
| 429 | `error.isRateLimited` | `ErrorState` and `EnquiryForm` show `t('enquiryForm.rateLimited')`; the form stays disabled | |

---

## 6. Endpoint index (19 endpoints)

All paths are relative to `/api/v1`. All are throttled by `public-api` (60/min/IP).

| # | Method | Path | Purpose | Paginated |
|---|---|---|---|---|
| E1 | GET | `/navigation` | Header + footer menu items | no |
| E2 | GET | `/homepage` | Aggregate for the home page | no |
| E3 | GET | `/pages` | List active CMS pages (no sections) | no |
| E4 | GET | `/pages/{slug}` | One CMS page with sections | no |
| E5 | GET | `/artists` | All active artists | no |
| E6 | GET | `/artists/{slug}` | Artist detail + exhibitions, awards, artworks | no |
| E7 | GET | `/artworks` | Catalogue with filters / sort | **yes** |
| E8 | GET | `/artworks/{inventoryCode}` | Artwork detail | no |
| E9 | GET | `/exhibitions` | Exhibitions list with status filter | **yes** |
| E10 | GET | `/exhibitions/{slug}` | Exhibition detail | no |
| E11 | GET | `/articles` | Journal list | **yes** |
| E12 | GET | `/articles/{slug}` | Journal article | no |
| E13 | GET | `/faqs` | All active FAQs | no |
| E14 | GET | `/site-settings` | Contact info, brand text, logo | no |
| E15 | GET | `/social-links` | Active social links | no |
| E16 | GET | `/enquiry-subjects` | Subjects for the contact form | no |
| E17 | **POST** | `/enquiries` | Submit a contact / artwork enquiry | n/a |
| E18 | GET | `/genres` | Active genres (slug + name) for catalogue filters | no |
| E19 | GET | `/mediums` | Active mediums (slug + name) for catalogue filters | no |

**Not API, but public and relevant** (defined in `routes/web.php`): `GET /` and `GET /{any}` (SPA shell with server-side SEO head), `GET /robots.txt`, `GET /sitemap.xml`. See [§16](#16-seo-and-page-metadata). A framework health route `GET /up` also exists.

**There is no endpoint** for price ranges, SEO overrides, media alt text, or a global search (genres and mediums: [E18](#e18-get-genres) / [E19](#e19-get-mediums)). See [§21](#21-things-that-could-not-be-determined-from-the-repository).

---

## 7. Endpoint reference

Conventions used below: **Nullable** column = may be `null` in the JSON. "Loc" = resolved with the field-level locale fallback of [§3](#3-locale-handling-az--en).

### E1 `GET /navigation`

**Purpose:** menu items for the header and the footer. The menu is fully admin-managed; see [§8](#8-navigation-in-depth) for the rules.

**Query:** `locale` (optional).

**Request body:** none.

**Response `200`:**

```json
{
  "data": {
    "header": [
      { "type": "page",  "title": "Ana səhifə", "href": "/" },
      { "type": "page",  "title": "Haqqımızda", "href": "/about" },
      { "type": "route", "route_key": "artworks",    "href": "/artworks" },
      { "type": "route", "route_key": "artists",     "href": "/artists" },
      { "type": "route", "route_key": "exhibitions", "href": "/exhibitions" },
      { "type": "route", "route_key": "articles",    "href": "/articles" }
    ],
    "footer": [
      { "type": "page", "title": "Məxfilik siyasəti", "href": "/privacy-policy" },
      { "type": "page", "title": "İstifadə şərtləri", "href": "/terms" }
    ]
  }
}
```

| Item field | Type | Nullable | Notes |
|---|---|---|---|
| `type` | `"page"` \| `"route"` | no | Enum `NavType`. |
| `title` | string | yes (Loc) | **Only on `page` items.** |
| `route_key` | `"artworks"` \| `"artists"` \| `"exhibitions"` \| `"articles"` | no | **Only on `route` items.** Enum `NavRouteKey`. |
| `href` | string | no | Site-relative path. Page items: `/` for the home page, otherwise `/{slug}` (Loc slug). Route items: fixed `/artworks`, `/artists`, `/exhibitions`, `/articles`. |

**Important:**
- **Array order is the display order.** There is no `sort_order` / `id` in the payload.
- **Route items carry no label.** The label comes from the frontend dictionary: `t(locale, 'nav.' + route_key)` (this is what `Header`/`Footer` do). Page items use `title`.
- `header` and `footer` are always present (possibly `[]`).
- Localization: page `title` and slug only.
- Validation errors: none (no validated params). Errors: only the generic ones in [§5](#5-errors-states-and-rate-limits).

### E2 `GET /homepage`

**Purpose:** everything the home page needs in one call.

**Query:** `locale` (optional). **Body:** none.

**Response `200`** (shape; arrays abbreviated — item shapes are defined in E7/E5/E10/E13/E15):

```json
{
  "data": {
    "page": {
      "title": "Ana səhifə",
      "sections": [
        {
          "key": "hero",
          "heading": "ArtNiyyətli",
          "body": "Müasir Azərbaycan sənətini kəşf edin.",
          "sort_order": 0,
          "image_url": "http://localhost:8080/storage/media/14/detail-webp.webp"
        },
        {
          "key": "steps",
          "heading": "Necə işləyir",
          "body": "Əsəri kəşf edin, sənətkarla tanış olun, sorğu göndərin, əsəri əldə edin.",
          "sort_order": 1,
          "image_url": null
        }
      ]
    },
    "stats": { "artists": 6, "artworks": 42, "exhibitions": 9 },
    "wall": [ /* artwork cards (E7 item) */ ],
    "featured": [ /* artwork cards, max 6 */ ],
    "artists": [ /* artist objects (E5 item) */ ],
    "exhibition": null,
    "faqs": [ { "id": 2, "question": "…", "answer": "…", "sort_order": 1 } ],
    "social_links": [
      {
        "platform": "Instagram",
        "url": "https://instagram.com/artniyyetli",
        "display_mode": "logo_only",
        "logo_url": "http://localhost:8080/storage/media/17/thumbnail-webp.webp",
        "sort_order": 1
      }
    ]
  }
}
```

| Key | Type | Nullable | Rules |
|---|---|---|---|
| `page` | object | **yes** | The CMS page of type `home` **if it is active**; otherwise `null`. |
| `page.title` | string | yes (Loc) | |
| `page.sections[]` | array | no | **Active** sections only, ascending `sort_order`. |
| `sections[].key` | string | no | Free-form identifier chosen in the admin — **not** a fixed backend enum (see *Section keys* below). The seeder creates `hero`, `steps`, `cta` as a convention. Do not assume the set or the order. |
| `sections[].heading`, `.body` | string | yes (Loc) | |
| `sections[].sort_order` | int | no | |
| `sections[].image_url` | string | yes | `detail` variant (max 1600 px); `null` if no image. |
| `stats.artists` / `.artworks` / `.exhibitions` | int | no | Counts of **active** rows (exhibitions: all statuses). |
| `wall` | array | no | Active artworks with `show_on_wall = true`, ordered by curator `sort_order` (the same admin ordering as before). **Capped server-side at 16** by default (`config('gallery.wall_limit')`, env `GALLERY_WALL_LIMIT`); if more artworks are flagged, only the first 16 in curator order are returned. The cap is **not** a query parameter (`?limit=` / `?wall_limit=` are ignored) and the wall is not paginated. Render for *up to* 16 and tolerate fewer. |
| `featured` | array | no | Active artworks with `featured = true`, curator order, **max 6**. |
| `artists` | array | no | Active artists **that have a usable AZ slug** (curator order), the same rule as [E5](#e5-get-artists); not limited. Note `stats.artists` still counts all active artists, including any hidden here. |
| `exhibition` | object | **yes** | The earliest-`start_date` active exhibition with status `current`; if none, the earliest active `upcoming`; else `null`. Full shape of [E10](#e10-get-exhibitionsslug) (artists, artworks, media, video). |
| `faqs` | array | no | Active FAQs **attached to the home page** only (not all FAQs). `[]` if there is no home page. Differs from `GET /faqs`. |
| `social_links` | array | no | Identical to `GET /social-links` (a test enforces parity). |

**Notes:** sections are ordered and copy is admin-editable — render headings/body from data, not hardcoded.

**Section keys are not a stable backend contract.**
- `page_sections.key` is a free string (max 255 characters, unique within a page). There is no enum or allow-list: the admin can create a section with any key, rename an existing key (`PUT/PATCH /admin/pages/sections/{section}`), deactivate a section and reorder sections. There is no delete route for sections, only deactivate.
- `hero`, `steps` and `cta` are only what `PageSeeder` creates by default (`updateOrCreate` by key). They are a convention the frontend can look for, not a guarantee. The dev database also holds an extra `test` section, and its `cta` is inactive (so it is absent from the API).
- The API returns **active** sections only, ordered by `sort_order`. So a deactivated, renamed or reordered `hero` means **`sections[0]` is not necessarily the hero**, and a section you expect may be missing.
- Recommended handling: identify known sections **by key** (`sections.find((s) => s.key === 'hero')`), render known keys in their designed slots, **ignore unknown keys** without error, and fall back to built-in defaults (e.g. brand text for the page title/description) when an expected key is missing. Do not use `sections[0]` / array index as a stand-in for `hero`. 
- **What the current SPA does (`HomePage.jsx`, since `2c64176`):** it finds `hero`, `steps` and `cta` **by key** and never by position. `hero` renders as the page `<h1>` and supplies the document title (`"{hero.heading} — ArtNiyyətli"`) and description; `steps` renders as an `<h2>` block under it; `cta` renders as an `<h2>` block at the bottom of the page. **Any other key is ignored** (not rendered). If `hero` is missing the page has no `<h1>` and the title falls back to `ArtNiyyətli` with no description; if `page` is `null` or `sections` is empty/absent nothing breaks. A section whose `heading` or `body` is empty just skips that part.
- The sections of [E4](#e4-get-pagesslug) are a separate case: the static-page template (`StaticPage.jsx`) renders **every** section in order and does not filter by key.

### E3 `GET /pages`

**Purpose:** list all active CMS pages (metadata + content, **no sections**). Ordered by internal id. The existing SPA does not call this; it is available e.g. for sitemaps or generic listings.

**Query:** `locale`. **Body:** none.

```json
{
  "data": [
    { "slug": "home",  "type": "home",  "title": "Ana səhifə", "content": "…" },
    { "slug": "about", "type": "about", "title": "Haqqımızda", "content": "…" },
    { "slug": "privacy-policy", "type": "custom", "title": "Məxfilik siyasəti", "content": "…" }
  ]
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `slug` | string | yes (Loc) | |
| `type` | `home` \| `about` \| `collectors` \| `contact` \| `custom` | no | Enum `PageType`. |
| `title` | string | yes (Loc) | |
| `content` | string | yes (Loc) | Plain authored text — see note under E4. |

Includes the `home` page and every `custom` page, **regardless of navigation placement**. Inactive and soft-deleted pages are excluded. Navigation fields are deliberately not exposed (use E1).

### E4 `GET /pages/{slug}`

**Purpose:** one CMS page including its sections.

**Path:** `slug` — matched against page slugs of **any** locale. **Query:** `locale`. **Body:** none.

```json
{
  "data": {
    "slug": "about",
    "type": "about",
    "title": "Haqqımızda",
    "content": "Qalereya haqqında…",
    "sections": [
      {
        "key": "team",
        "heading": "Komanda",
        "body": "…",
        "sort_order": 0,
        "image_url": "http://localhost:8080/storage/media/31/detail-webp.webp"
      }
    ]
  }
}
```

Fields: as E3 plus `sections[]` (same shape as homepage sections; **active only**, ascending `sort_order`; may be `[]`).

**Errors:** `404` if the slug is unknown, the page is inactive, or the page is soft-deleted.

**Frontend notes:**
- `content` and section `body` are **opaque authored text**. The API neither sanitises nor marks them up. The existing `StaticPage` renders them as **plain text** with `whitespace-pre-wrap`. **Do not inject them as HTML.**
- The seeded legal pages (`privacy-policy`, `terms`, `shipping-returns`, `copyright`, type `custom`) currently contain `[PLACEHOLDER]` copy. They are ordinary pages.
- A page of type `contact` exists (`/contact`) but the SPA renders `/contact` with the enquiry form, **not** with this page's content ([§22](#22-known-gaps-and-gotchas-in-the-current-implementation)).

### E5 `GET /artists`

**Purpose:** all active artists **that have a usable AZ slug**. **Not paginated.** Ordered by curator `sort_order`, then `id`.

**Public invariant (since `b2bab8d`):** an active artist is listed only if it has an **AZ translation with a non-empty slug**. Artists with no translation, or with only an EN translation, are **not returned** here nor in `homepage.artists`. The AZ translation is the canonical one that every other locale falls back to, so `slug` in this list is therefore never `null` (with `?locale=en` it is the EN slug when one exists, otherwise the AZ slug). Existing valid AZ artists are unaffected.

**Query:** `locale`. **Body:** none.

```json
{
  "data": [
    {
      "id": 3,
      "slug": "leyla-mammadova",
      "first_name": "Leyla",
      "last_name": "Məmmədova",
      "birth_year": 1984,
      "birth_place": "Bakı",
      "direction": "Müasir abstrakt rəssamlıq",
      "biography": "Leyla Məmmədova 1984-cü ildə…",
      "artistic_approach": "Rəng və faktura vasitəsilə…",
      "portrait_url": "http://localhost:8080/storage/media/21/detail-webp.webp"
    }
  ]
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | int | no | Use this as the `artist` filter value on E7. |
| `slug` | string | no (Loc) | Always present in this list (see the invariant above). It **can still be `null` elsewhere** — `artists[]` inside an exhibition ([E10](#e10-get-exhibitionsslug)) and any artist reached by other paths are not filtered. |
| `first_name`, `last_name` | string | yes (Loc) | |
| `birth_year` | int | yes | Not localized. |
| `birth_place`, `direction`, `biography`, `artistic_approach` | string | yes (Loc) | |
| `portrait_url` | string | yes | `detail` variant (≤ 1600 px). |

The list omits `exhibitions`, `awards`, `artworks` (the keys are **absent**, not empty). Contact fields are never exposed.

**Not changed:** `GET /artists/{slug}` still resolves any translation slug of an active artist (locale-agnostic), and `stats.artists` in E2 counts all active artists.

**Admin behaviour behind this (for context; the public SPA never calls `/admin/*`):** creating an artist (`POST /admin/artists`) requires an **`az` translation** (with `slug`, `first_name`, `last_name`); otherwise `422` with `errors.translations`. Updating (`PUT /admin/artists/{id}`) requires the same when `translations` is sent and the artist has no stored AZ translation. An update that sends **only the EN translation** for an artist that already has an AZ one is still accepted and does **not** overwrite the stored AZ translation. Slugs must be valid and unique per locale.

### E6 `GET /artists/{slug}`

**Purpose:** artist page.

**Path:** `slug` (any locale). **Query:** `locale`. **Body:** none.

```json
{
  "data": {
    "id": 3,
    "slug": "leyla-mammadova",
    "first_name": "Leyla",
    "last_name": "Məmmədova",
    "birth_year": 1984,
    "birth_place": "Bakı",
    "direction": "Müasir abstrakt rəssamlıq",
    "biography": "…",
    "artistic_approach": "…",
    "portrait_url": "http://localhost:8080/storage/media/21/detail-webp.webp",
    "exhibitions": [
      { "year": 2023, "title": "Yeni nəfəs", "venue": "Bakı Qalereyası" }
    ],
    "awards": [
      { "year": 2022, "title": "Gənc rəssam mükafatı" }
    ],
    "artworks": [
      {
        "inventory_code": "AN-2026-014",
        "title": "Səhər işığı",
        "image_url": "http://localhost:8080/storage/media/10/catalogue-webp.webp",
        "genre":  { "slug": "abstract", "name": "Abstrakt" },
        "medium": { "slug": "oil-on-canvas", "name": "Kətan üzərində yağlı boya" },
        "price": 4500,
        "currency": "AZN",
        "availability": "available",
        "width_cm": 100,
        "height_cm": 80
      }
    ]
  }
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| (all E5 fields) | | | same types |
| `exhibitions[]` | `{year:int, title:string\|null, venue:string\|null}` | array never null | Ordered by `sort_order`. `year` is not nullable. |
| `awards[]` | `{year:int, title:string\|null}` | array never null | Ordered by `sort_order`. |
| `artworks[]` | artwork cards | array never null | **Active** artworks only, ordered by curator `sort_order`, **not paginated**. |

> **Important quirk:** the artist's `artworks[]` cards **do not contain the `artist` key** (that relation is not loaded here). `genre`, `medium`, `image_url` etc. are present. Write card components to tolerate a missing `artist` (`artwork.artist?.name`) — the existing `ArtworkCard` does.

**Errors:** `404` for unknown slug, inactive artist, or soft-deleted artist.

### E7 `GET /artworks`

**Purpose:** the catalogue: filterable, sortable, paginated. Only **active, non-deleted** artworks. **Sold artworks stay visible** (with `availability: "sold"`).

**Query parameters** (validated by `PublicArtworkIndexRequest`; all optional; multiple filters combine with AND):

| Param | Rule | Meaning |
|---|---|---|
| `locale` | `az`\|`en` | See [§3](#3-locale-handling-az--en). |
| `artist` | integer ≥ 1 | Artist **id** (the `id` from E5 / `artist.id` on cards). |
| `genre` | string ≤ 100 | Genre **slug** (the `genre.slug` on cards — a stable, non-localized slug). |
| `medium` | string ≤ 100 | Medium **slug** (`medium.slug` on cards). |
| `status` | `available`\|`reserved`\|`sold` | Availability. |
| `price_min` | numeric ≥ 0 | Inclusive lower bound on the stored price. May be sent alone. |
| `price_max` | numeric ≥ 0; `>= price_min` **only when `price_min` is also sent** | Inclusive upper bound. **May be sent alone** (fixed in `b2bab8d`; earlier it returned `422` without `price_min`). |
| `size_min` | numeric ≥ 0 | Inclusive lower bound on the artwork's **size in cm**. May be sent alone. |
| `size_max` | numeric ≥ 0; `>= size_min` **only when `size_min` is also sent** | Inclusive upper bound on the size in cm. May be sent alone. |
| `sort` | `newest`\|`price_asc`\|`price_desc` | `newest` = `created_at` desc. **Default (param absent):** curator `sort_order` asc, then `id`. |
| `page`, `per_page` | see [§4](#4-pagination) | |

Empty-string params (`artist=`) are treated as absent.

**Price bounds:** `price_min=100` → price ≥ 100; `price_max=1000` → price ≤ 1000; both → 100 ≤ price ≤ 1000. Invalid cases return `422` (`errors.price_min` / `errors.price_max`): non-numeric (`price_max=abc` → "must be a number"), negative (`price_max=-1` → "must be at least 0"), and `price_max` lower than a supplied `price_min` (`price_min=500&price_max=100` → "The price max field must be greater than or equal to 500.").

**Size bounds:** an artwork's *size* is the **larger of `width_cm` and `height_cm`** (orientation does not matter: 20×120 and 120×20 both have size 120). `size_min` keeps artworks whose size is ≥ the value; `size_max` keeps those whose size is ≤ the value; both boundaries are **inclusive** (a 60×100 work matches `size_min=100`, `size_max=100`, and both together). Units are **centimetres**. The two parameters are independent; combined they define a range. Invalid cases return `422` on `size_min` / `size_max`: non-numeric, negative, or `size_max` lower than a supplied `size_min` (`size_min=100&size_max=50` → "The size max field must be greater than or equal to 100."). `size_max=50` alone is valid (`200`, possibly an empty `data`). Both dimensions are required, non-null columns, so no artwork is ever excluded for a missing dimension.

**Request body:** none.

**Response `200`** (paginated):

```json
{
  "data": [
    {
      "inventory_code": "AN-2026-014",
      "title": "Səhər işığı",
      "artist": { "id": 3, "name": "Leyla Məmmədova" },
      "image_url": "http://localhost:8080/storage/media/10/catalogue-webp.webp",
      "genre":  { "slug": "abstract", "name": "Abstrakt" },
      "medium": { "slug": "oil-on-canvas", "name": "Kətan üzərində yağlı boya" },
      "price": 4500,
      "currency": "AZN",
      "availability": "available",
      "width_cm": 100,
      "height_cm": 80
    }
  ],
  "links": { "first": "…", "last": "…", "prev": null, "next": null },
  "meta": { "current_page": 1, "from": 1, "last_page": 1, "links": [ /* … */ ], "path": "…", "per_page": 24, "to": 1, "total": 1 }
}
```

**Card fields** (`ArtworkCardResource`, also used in E2, E6, E8 `similar`, E9/E10):

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `inventory_code` | string | no | Public identifier, used in URLs (`/artworks/{code}`). Unique. Format produced by the admin generator: `AN-<year>-<3-digit zero-padded sequence>`, e.g. `AN-2026-014`. Admins can also enter other codes, so treat it as an opaque string. |
| `title` | string | yes (Loc) | |
| `artist` | `{id:int, name:string}` | key **absent** on some endpoints (see E6) | `name` may be `""`. |
| `image_url` | string | yes | `catalogue` variant (≤ 800 px) of the image flagged `is_main`; `null` if no main image or no variant exists. |
| `genre` | `{slug:string, name:string\|null}` | key absent if relation not loaded | `name` is Loc; can be `null`. |
| `medium` | `{slug:string, name:string\|null}` | as above | |
| `price` | number | **yes** | `null` when the gallery hides the price (`show_price = false`) → show "price on request". |
| `currency` | string | **yes** | `null` exactly when `price` is `null`; otherwise the gallery currency (env `GALLERY_CURRENCY`, default `AZN`). Always render price together with `currency`. |
| `availability` | `available`\|`reserved`\|`sold` | no | Enum `ArtworkAvailability`. |
| `width_cm`, `height_cm` | number | no | Useful for aspect-ratio placeholders. |

**Validation errors:** `422` with `errors.<param>` (e.g. `status`, `price_max`, `size_min`, `size_max`, `sort`, `artist`). Sending a non-scalar value for a validated param (`artist[]=1`, `genre[]=x`) is also a `422` (verified for `artist[]`); `422` responses are never cached.

**Frontend notes:**
- The list endpoint returns **no facets/counts**. Build the genre and medium filters from [E18](#e18-get-genres) / [E19](#e19-get-mediums) (their `slug` is what `genre` / `medium` expect). To build an artist filter, use E5.
- **Known follow-up / security consideration (not fixed):** the price filters (`price_min`, `price_max`) and price sorts (`price_asc`, `price_desc`) operate on the real stored price **even when `show_price` is false**. Hidden-price works still participate, so a client can infer a hidden price from filter results or ordering. The card still returns `price: null`. `b2bab8d` did not change this; it is tracked as a separate backend task.
- The current `listArtworks` service forwards only `page, artist, status, sort, price_min, price_max` — it does **not** forward `genre`, `medium`, `per_page`, `size_min` or `size_max`. Extend `services/artworks.js` if you need them; the API already supports them.
- Filters and page are kept in component state on the catalogue page, not in the URL.

### E8 `GET /artworks/{inventoryCode}`

**Purpose:** artwork detail.

**Path:** `inventoryCode` (exact code, e.g. `AN-2026-014`). **Query:** `locale`. **Body:** none.

```json
{
  "data": {
    "inventory_code": "AN-2026-014",
    "title": "Səhər işığı",
    "artist": { "id": 3, "name": "Leyla Məmmədova" },
    "image_url": "http://localhost:8080/storage/media/10/catalogue-webp.webp",
    "genre":  { "slug": "abstract", "name": "Abstrakt" },
    "medium": { "slug": "oil-on-canvas", "name": "Kətan üzərində yağlı boya" },
    "price": 4500,
    "currency": "AZN",
    "availability": "available",
    "width_cm": 100,
    "height_cm": 80,
    "year_created": 2021,
    "short_description": "Səhər işığının kətanda təsviri.",
    "provenance": "Rəssamın şəxsi kolleksiyası.",
    "certificate": true,
    "frame_condition": "Orijinal taxta çərçivə.",
    "delivery_note": "Sığortalı çatdırılma mümkündür.",
    "images": [
      { "type": "main",   "sort_order": 0, "is_main": true,  "url": "http://localhost:8080/storage/media/10/full-webp.webp" },
      { "type": "detail", "sort_order": 1, "is_main": false, "url": "http://localhost:8080/storage/media/11/full-webp.webp" }
    ],
    "similar": [ /* up to 4 artwork cards */ ],
    "video": { "id": "Faw55XUneOM", "embed_url": "https://www.youtube-nocookie.com/embed/Faw55XUneOM" },
    "whatsapp_link": "https://wa.me/994501234567?text=Salam%2C%20S%C9%99h%C9%99r%20i%C5%9F%C4%B1%C4%9F%C4%B1%20%28AN-2026-014%29%20%C9%99s%C9%99ri%20il%C9%99%20maraqlan%C4%B1ram."
  }
}
```

Everything in the card (E7) **plus**:

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `year_created` | int | no | |
| `short_description` | string | yes (Loc) | |
| `provenance` | string | yes (Loc) | |
| `certificate` | boolean | no | Whether a certificate of authenticity exists. |
| `frame_condition` | string | yes | Not localized. |
| `delivery_note` | string | yes | Not localized. |
| `images[]` | array | no (may be `[]`) | **All** images, ascending `sort_order`. |
| `images[].type` | `main`\|`detail`\|`frame`\|`wall` | no | Enum `ArtworkImageType`. |
| `images[].sort_order` | int | no | |
| `images[].is_main` | boolean | no | |
| `images[].url` | string | yes | **`full` variant (≤ 2400 px)** — a larger file than the card's `image_url`. |
| `similar[]` | cards | no (may be `[]`) | Active artworks with the **same genre**, excluding this one, curator order, **max 4**. May include sold works. |
| `video` | `{id, embed_url}` | **yes** | See [§12](#12-youtube-video). |
| `whatsapp_link` | string | **yes** | See [§13](#13-whatsapp-behaviour). |

Not exposed: `year_sold`, `featured`, `show_on_wall`, `sort_order`, internal notes, storage paths/disks.

**Errors:** `404` for an unknown code, an inactive artwork, or a soft-deleted artwork.

**Enquiry behaviour:** see [§14](#14-artwork-availability-price-and-enquiry-behaviour) and [§15](#15-contact-form-and-artwork-enquiry-form).

### E9 `GET /exhibitions`

**Purpose:** paginated exhibitions list. Only active, non-deleted. Ordered by **`start_date` descending**.

**Query:**

| Param | Rule | Meaning |
|---|---|---|
| `locale` | `az`\|`en` | |
| `filter` | `current`\|`upcoming`\|`archive` | Filters by the stored `status`. `archive` ⇒ status `past`. Absent ⇒ all statuses. |
| `page`, `per_page` | see [§4](#4-pagination) | |

**Body:** none. **Errors:** `422` for an unknown `filter` (`errors.filter`).

**Item shape:** identical to E10 (the list eager-loads everything, so each item already contains `artists`, `artworks`, `media`, `video`).

> `status` (`current` / `upcoming` / `past`) is a **stored value set by the admin**. It is **not** computed from `start_date`/`end_date`, so the two can disagree; always trust `status`.

### E10 `GET /exhibitions/{slug}`

**Purpose:** exhibition detail. **Path:** `slug` (any locale). **Query:** `locale`. **Body:** none.

```json
{
  "data": {
    "slug": "yeni-nefes",
    "title": "Yeni nəfəs",
    "type": "exhibition",
    "status": "current",
    "start_date": "2026-09-01",
    "end_date": "2026-10-15",
    "venue": "Bakı Qalereyası",
    "short_text": "Beş rəssamın yeni işləri.",
    "full_text": "Sərgi haqqında ətraflı mətn…",
    "artists": [
      { "id": 3, "slug": "leyla-mammadova", "name": "Leyla Məmmədova" }
    ],
    "artworks": [ /* artwork cards; each includes `artist` */ ],
    "media": [
      { "type": "photo", "url": "http://localhost:8080/storage/media/40/detail-webp.webp" }
    ],
    "video": { "id": "Faw55XUneOM", "embed_url": "https://www.youtube-nocookie.com/embed/Faw55XUneOM" }
  }
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `slug` | string | yes (Loc) | |
| `title`, `venue`, `short_text`, `full_text` | string | yes (Loc) | |
| `type` | `exhibition`\|`news`\|`announcement` | no | Enum `ExhibitionType`. The same endpoint carries all three kinds; the current SPA ignores `type`. |
| `status` | `current`\|`past`\|`upcoming` | no | Enum `ExhibitionStatus`. |
| `start_date`, `end_date` | string `YYYY-MM-DD` | no | |
| `artists[]` | `{id:int, slug:string\|null, name:string}` | no | Ordered by the exhibition's own artist order. `slug` is Loc → can be `null`; `name` may be `""`. |
| `artworks[]` | cards | no | **Active** artworks only, in the exhibition's own order. Not paginated. Cards include `artist`. |
| `media[]` | `{type, url}` | no | Ordered by `sort_order`. `type` ∈ `photo`\|`video` (enum `ExhibitionMediaType`). `url` is the `detail` variant (≤ 1600 px) and can be `null`. |
| `video` | `{id, embed_url}` | **yes** | YouTube, see [§12](#12-youtube-video). |

**Errors:** `404` for unknown / inactive / soft-deleted.

### E11 `GET /articles`

**Purpose:** journal list, paginated, newest first (`published_at` desc).

**Visibility rule** (all must hold): `status = published` **and** `is_active` **and** `published_at` is set **and** `published_at <= now` **and** not soft-deleted. Drafts and future-dated articles are invisible.

**Query:** `locale`, `page`, `per_page`. **Body:** none. **Item shape:** identical to E12 (the list includes the full `content`).

### E12 `GET /articles/{slug}`

**Path:** `slug` (any locale). **Query:** `locale`. **Body:** none.

```json
{
  "data": {
    "slug": "leyla-mammadova-ile-musahibe",
    "title": "Leyla Məmmədova ilə müsahibə",
    "type": "interview",
    "short_text": "Rəssamla rəng və işıq haqqında.",
    "content": "Tam mətn…",
    "published_at": "2026-09-10T09:30:00+04:00",
    "media": [
      { "type": "image", "url": "http://localhost:8080/storage/media/52/detail-webp.webp" }
    ]
  }
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `slug`, `title`, `short_text`, `content` | string | yes (Loc) | `content` is opaque authored text — render as plain text, never HTML. |
| `type` | `interview`\|`video_project`\|`art_article`\|`exhibition_review`\|`news`\|`announcement` | no | Enum `ArticleType`. |
| `published_at` | string (ISO 8601 with offset) | practically no | Always set for anything visible (see rule above); the resource itself is null-safe. |
| `media[]` | `{type, url}` | no | Ordered by `sort_order`. `type` is the media type `image`\|`video` (enum `MediaType`). `url` is the `detail` variant and can be `null`. The SPA uses `media[0]` as the cover. |

**Errors:** `404` for unknown, draft, future-dated, inactive, or soft-deleted.

### E13 `GET /faqs`

**Purpose:** all active FAQs across **all** pages. Ordered `sort_order`, then `id`. Not paginated. **Query:** `locale`. **Body:** none.

```json
{ "data": [ { "id": 2, "question": "Əsəri necə əldə edə bilərəm?", "answer": "Sorğu göndərin…", "sort_order": 1 } ] }
```

| Field | Type | Nullable |
|---|---|---|
| `id` | int | no |
| `question`, `answer` | string | yes (Loc) |
| `sort_order` | int | no |

Every FAQ belongs to a page in the database, but the public payload does not say which one. For the home page's FAQs use `homepage.faqs` (E2). The service `services/faqs.js` exists in the SPA but **no page currently uses it**.

### E14 `GET /site-settings`

**Purpose:** contact details, footer text, WhatsApp number and branding. **Query:** `locale` (accepted but **ignored** — values are not localized). **Body:** none.

```json
{
  "data": {
    "contact_email": "info@example.com",
    "phone": "+994 12 000 00 00",
    "address": "Nizami küç. 1, Bakı",
    "opening_hours": "Bazar ertəsi–Şənbə 11:00–19:00",
    "footer_text": "© ArtNiyyətli",
    "whatsapp_number": "994501234567",
    "brand_text": "ArtNiyyətli",
    "logo_media_id": "15",
    "logo_display_mode": "logo_text",
    "logo_url": "http://localhost:8080/storage/media/15/thumbnail-webp.webp"
  }
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `contact_email`, `phone`, `address`, `opening_hours`, `footer_text` | string | yes | `null` = never set, `""` = cleared. Check truthiness. |
| `whatsapp_number` | string | yes | **Digits only** since Phase 12 (the admin API validates a phone-like value and stores it stripped of `+`, spaces and punctuation, e.g. `994501234567`). Rows saved before that change may still hold the original punctuation until re-saved; the artwork `whatsapp_link` always uses digits only ([§13](#13-whatsapp-behaviour)). If you show this number to visitors, format it yourself. |
| `brand_text` | string | **no** | Falls back to `"ArtNiyyətli"` when unset/empty. |
| `logo_media_id` | **string** (e.g. `"15"`) | yes | Raw stored id, `""`/`null` when no logo. **Do not use it for rendering** — use `logo_url`. Note it is a string, not an int. |
| `logo_display_mode` | `logo_text`\|`logo_only`\|`text_only` | **no** | Falls back to `logo_text` when unset/empty. Enum `LogoDisplayMode`. |
| `logo_url` | string | yes | Derived on every request from `logo_media_id`: the `thumbnail-webp` variant, else `thumbnail-jpeg`, else `null` (also `null` if the media was deleted). Max 300 px on the longest edge. |

Only allow-listed keys are ever returned; other settings never leak. See [§9](#9-branding-logo-brand-text-display-mode) for rendering rules.

### E15 `GET /social-links`

**Purpose:** active social links for header/footer. **Query:** `locale` (accepted, **ignored**). **Body:** none.

```json
{
  "data": [
    {
      "platform": "Instagram",
      "url": "https://instagram.com/artniyyetli",
      "display_mode": "logo_only",
      "logo_url": "http://localhost:8080/storage/media/17/thumbnail-webp.webp",
      "sort_order": 0
    },
    {
      "platform": "Facebook",
      "url": "https://facebook.com/artniyyetli",
      "display_mode": "logo_text",
      "logo_url": null,
      "sort_order": 1
    }
  ]
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `platform` | string | no | Free text chosen by the admin (max 100). Not localized. Not an enum — **do not hardcode platform names or icons**. |
| `url` | string | no | Validated by the admin API to be `http`/`https` only (max 2048). |
| `display_mode` | `logo_text`\|`logo_only`\|`text_only` | no | Enum `LogoDisplayMode`. Default for existing links: `logo_text`. |
| `logo_url` | string | yes | `thumbnail-webp` → `thumbnail-jpeg` → `null`. `null` when no logo was chosen or the media has no variants. |
| `sort_order` | int | no | Already applied: the array is ordered by `sort_order`, then `id`. |

**Visibility:** only `is_active = true` links are returned; the payload has no `is_active` or `id`. The array is `[]` when there are none. Full rendering rules: [§10](#10-social-media-links).

### E16 `GET /enquiry-subjects`

**Purpose:** the subject options for the contact form. **Query:** `locale`. **Body:** none.

```json
{
  "data": [
    { "key": "buy",                   "label": "Əsər almaq" },
    { "key": "general_contact",       "label": "Ümumi əlaqə" },
    { "key": "artist_submission",     "label": "Rəssam müraciəti" },
    { "key": "media",                 "label": "Media sorğusu" },
    { "key": "exhibition_invitation", "label": "Sərgi / dəvət" },
    { "key": "collaboration",         "label": "Əməkdaşlıq" }
  ]
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `key` | string | no | The value to send as `subject` in E17. |
| `label` | string | yes (Loc) | Display text. The SPA hides subjects whose `label` is `null`. |

Rules: only **active** subjects, ordered `sort_order` then `id`, and the legacy `other` subject is **always excluded**. A subject's `is_active` flag only affects this list — E17 validates against a fixed list of six keys (see E17).

### E17 `POST /enquiries`

**Purpose:** the single unified enquiry endpoint. It powers **both** the general contact form and the artwork enquiry ("buy") form; they differ only in `subject` and `artwork_code`.

**Headers:** `Content-Type: application/json`, `Accept: application/json`. No auth, no CSRF token.

**Query string:** **none allowed.** The validator inspects *all* input including query parameters, so even `POST /enquiries?locale=en` is rejected with `_unexpected` (verified). Never append `?locale=` to this call (the SPA's `publicApiPost` correctly sends no query).

**Request body** (JSON):

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | **yes** | max 255 |
| `email` | string | **yes** | valid e-mail, max 255 |
| `phone` | string \| null | no | max **30** |
| `message` | string | **yes** | max **5000** |
| `subject` | string | **yes** | one of `buy`, `general_contact`, `artist_submission`, `media`, `exhibition_invitation`, `collaboration` (exactly these six; `other` and any unknown value → 422) |
| `artwork_code` | string | **required iff `subject = "buy"`; prohibited otherwise** | must be the `inventory_code` of an existing, **active, non-deleted** artwork; max 100 |
| `website` | string \| null | no | **Honeypot** — must stay empty (see below), max 255 |

**Any other key** in the body or query string → `422` with an `_unexpected` error (e.g. `meta`, `locale`, `status`).

Artwork enquiry example:

```json
{
  "name": "Aysel Məmmədova",
  "email": "aysel@example.com",
  "phone": "+994501234567",
  "message": "Bu əsər haqqında məlumat almaq istəyirəm.",
  "subject": "buy",
  "artwork_code": "AN-2026-014",
  "website": ""
}
```

General contact example (no `artwork_code`):

```json
{
  "name": "Aysel Məmmədova",
  "email": "aysel@example.com",
  "phone": "",
  "message": "Sərgiləriniz haqqında məlumat almaq istəyirəm.",
  "subject": "general_contact",
  "website": ""
}
```

(Laravel converts empty strings to `null`, so sending `phone: ""` / `website: ""` is fine — the SPA does.)

**Success — `201 Created`:**

```json
{ "message": "Sorğunuz qeydə alındı." }
```

The message is a fixed Azerbaijani string; the SPA shows its own localized text (`t('enquiryForm.success')`) instead. The response contains no id or internal fields. The enquiry is stored with status `new`; the e-mail notification to the gallery (setting `contact_email`, else env `ENQUIRY_NOTIFICATION_EMAIL`) is sent **after the response has been delivered** (same PHP process, `->afterResponse()`), so the `201` never waits for the mail server, and a mail failure is only logged — it never changes the response. There is no retry.

**Honeypot:** if `website` is non-empty the server returns the **same `201` success** but stores nothing and sends nothing. So a `201` does not prove a record was created for a bot — and real users must never fill it. Render it as a real, tabbable-but-off-screen input (`position:absolute; left:-9999px`, `tabIndex=-1`, `autocomplete="off"`, `aria-hidden`), **not** `display:none` / `type="hidden"` (the existing `EnquiryForm` shows the pattern).

**Validation failure — `422`** (real output):

```json
{
  "message": "The name field is required. (and 4 more errors)",
  "errors": {
    "name":         ["The name field is required."],
    "email":        ["The email field must be a valid email address."],
    "phone":        ["The phone field must not be greater than 30 characters."],
    "message":      ["The message field is required."],
    "artwork_code": ["The artwork code field is required when subject is buy."]
  }
}
```

Other real error bodies:

| Situation | `errors` |
|---|---|
| Unknown / inactive / soft-deleted `artwork_code` | `{ "artwork_code": ["The selected artwork code is invalid."] }` |
| `artwork_code` sent with a non-`buy` subject | `{ "artwork_code": ["The artwork code field is prohibited unless subject is in buy."] }` |
| Missing / unknown / `other` subject | `{ "subject": [...] }` |
| Extra key (incl. query string `locale`) | `{ "_unexpected": ["Unexpected fields: locale"] }` |
| Enquiry for a **sold** artwork (default config) | `{ "artwork_code": ["Bu əsər üçün artıq sorğu qəbul edilmir."] }` (Azerbaijani text). Only reported when no other validation error exists. Disabled by env `ALLOW_SOLD_ENQUIRIES=true`, which the API does **not** expose. `reserved` artworks are accepted. |

**Rate limit — `429`:** `{ "message": "Too Many Attempts." }` with `Retry-After`. Two limiters apply (60/min general, **5/hour per IP** for this endpoint). The frontend should show a "try again later" message and stop retrying (the SPA disables the form).

**Localization:** none — messages are fixed English (validation) or fixed Azerbaijani (success / sold). Map errors by **field key** to your own localized copy.

**CORS:** unless the operator sets `PUBLIC_API_CORS_ALLOW_POST=true` (and lists your origin in `PUBLIC_API_CORS_ORIGINS`), the POST is not covered by the CORS allow-list (`GET, HEAD, OPTIONS` only). It works same-origin — see [§22](#22-known-gaps-and-gotchas-in-the-current-implementation). **No response is cached and no CSRF token is needed**; the request must be JSON with `Accept: application/json`.

### E18 `GET /genres`

**Purpose:** the genres a visitor can filter the catalogue by. **Query:** `locale`. **Body:** none. **Not paginated.**

```json
{
  "data": [
    { "slug": "abstract", "name": "Abstrakt", "sort_order": 0 },
    { "slug": "portrait", "name": "Portret", "sort_order": 1 }
  ]
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `slug` | string | no | Non-localized, unique. Send it as `genre` on [E7](#e7-get-artworks). |
| `name` | string | yes (Loc) | Same field-level fallback as elsewhere ([§3](#3-locale-handling-az--en)): the requested locale, else AZ. `null` when the genre has no translation (the dev database has such genres) — hide the entry or fall back to the slug. |
| `sort_order` | int | no | The curator order the list is already in. |

Rules: only **active** genres (`is_active = true`; the flag itself is not exposed), ordered by `sort_order` then `id`. There are no counts/facets, and genres cannot yet be managed from the admin (only listed in the artwork editor), so the list changes only through the database. Same cache headers and rate limit as every public GET ([§24](#24-http-caching-cookies-security-headers-and-csp)): `Cache-Control: public, max-age=60`, strong `ETag`, `304` on `If-None-Match`.

### E19 `GET /mediums`

Identical to [E18](#e18-get-genres) for **mediums**: `{ "data": [ { "slug": "oil-on-canvas", "name": "Kətan üzərində yağlı boya", "sort_order": 0 } ] }`. `slug` is the value for the `medium` filter on E7. Same rules, nullability, ordering and caching.

---

## 8. Navigation in depth

Navigation is stored in the `navigation_items` table (managed in the admin) and served by [E1](#e1-get-navigation). It **replaced** the old per-page placement/ordering columns; those no longer exist.

**Two item kinds**

| Kind | Points to | Payload | Label source |
|---|---|---|---|
| `page` | a CMS page | `{type:"page", title, href}` | `title` from the API (localized) |
| `route` | one of four fixed catalogue routes | `{type:"route", route_key, href}` | frontend dictionary `nav.<route_key>` |

**Fixed public routes** (enum `NavRouteKey`): `artworks → /artworks`, `artists → /artists`, `exhibitions → /exhibitions`, `articles → /articles`. These are the only route items that can exist. There is **no** navigation entry for `/contact`, `/faqs` etc. except as a CMS page item.

**Placements:** `header` and `footer` (two arrays in the response).

**Ordering:** ascending admin `sort_order` within each placement. The payload has no sort field — the order of the array is the order to render. Within one placement a given page, and a given route, can appear at most once.

**Visibility rules** (an item is returned only if all apply):
1. The item is marked visible (`is_visible = true`). Hidden items are simply absent.
2. For `page` items: the underlying page is **active** and **not soft-deleted**. An inactive page, or a deleted ("archived") page, disappears from the menu **and** its `GET /pages/{slug}` returns `404`.
3. `route` items have no such dependency; they appear whenever they are visible.

**Navigation visibility ≠ content availability.** A page hidden from the menu (or a route item hidden from the menu) is still reachable by URL and via its endpoint. The menu only controls what is *linked*.

**Home page item:** the `href` is `/` (not `/home`), regardless of the page's slug.

**Seed data:** on a fresh install the migration creates the four route items in the header; `PageSeeder` adds the singleton pages (home, about, collectors, contact) to the header and four legal pages to the footer. Admins can change all of it, so never hardcode the menu.

**What the SPA does today:** `Header` renders every `header` item (+ social links + locale switcher); `Footer` renders every `footer` item inside `<nav aria-label="Legal">`. Both use the same `itemLabel` helper (`page` → `title`, `route` → `t('nav.'+route_key)`).

---

## 9. Branding (logo, brand text, display mode)

Data comes from [E14 `GET /site-settings`](#e14-get-site-settings): `brand_text`, `logo_url`, `logo_display_mode` (and `logo_media_id`, which you should ignore).

**Rendering rules** — implemented once in `components/BrandMark.jsx` and used by both the header (`<a href="/">`) and footer:

```js
const showLogo = Boolean(logoUrl) && displayMode !== 'text_only';
const showText = displayMode !== 'logo_only' || !logoUrl;   // text is the fallback when there is no logo
const imgAlt   = showText ? '' : brandText;                  // decorative if text is visible, otherwise name it
```

| `logo_display_mode` | With `logo_url` | Without `logo_url` |
|---|---|---|
| `logo_text` (default) | logo **and** text | text only |
| `logo_only` | logo only (`alt` = brand text) | **text only** (never renders empty) |
| `text_only` | text only | text only |

Defaults: `brand_text` is never empty (`"ArtNiyyətli"` fallback), `logo_display_mode` is never empty (`logo_text`). Guard against the request being in flight or failed: the SPA uses `settings.data?.brand_text || 'ArtNiyyətli'` and `settings.data?.logo_display_mode || 'logo_text'`.

The logo is the **thumbnail** variant (≤ 300 px longest edge). Size it with CSS; do not assume it is high-resolution.

The `<title>` suffix `— ArtNiyyətli` is a frontend/SEO constant (`SeoText::SITE_NAME`), **not** driven by `brand_text`.

---

## 10. Social media links

Data comes from [E15](#e15-get-social-links) (and identically from `homepage.social_links`).

**Admin model (what an admin configures):** platform name (free text), URL (http/https), logo (chosen from the media library), display mode, active/inactive, order. Backend rule: `logo_only` **requires** a logo; `logo_text` and `text_only` do not.

**Public rendering** — the SPA component `components/SocialLinks.jsx` renders each link as `<a href={url} target="_blank" rel="noopener noreferrer">` wrapping a `BrandMark` (same three-mode logic as branding, with `platform` as the text). Since Phase 12 it **only renders links whose `url` parses as `http:` or `https:`**; anything else (`javascript:`, `data:`, a malformed value) is silently skipped, as a last line of defence — the admin API already accepts only http/https, but the API response itself is not filtered:

| `display_mode` | Has `logo_url` | Result |
|---|---|---|
| `logo_text` | yes | icon (decorative, `alt=""`) + platform text |
| `logo_text` | no | platform text only |
| `logo_only` | yes | icon only, `alt = platform` (accessible name) |
| `logo_only` | no | platform text only (fallback — never empty) |
| `text_only` | any | platform text only (logo ignored) |

**Where it appears:** `Header` (inside the nav, before the locale switcher) **and** `Footer` — every returned link is rendered in both places; there is no per-placement flag. When the array is empty/not yet loaded, nothing is rendered.

**Rules to keep:**
- Never hardcode platform names, icons or order — everything comes from the API.
- The API returns only **active** links, already **sorted**.
- `platform` can repeat (two Instagram accounts). The SPA keys list items by `index + url`, not by platform.
- Text is admin-entered and not localized. The SPA applies `capitalize` styling to the text.
- `logo_url` is a small thumbnail; size icons with CSS (the SPA uses `h-5 w-5 object-contain`).
- Open external links with `target="_blank"` + `rel="noopener noreferrer"` (the router deliberately ignores `target="_blank"` links), and never put an API-provided URL into an `href`/`src` without checking that it is `http(s)` (follow `SocialLinks.jsx`).

---

## 11. Images, media URLs and variants

**One URL per image.** The API returns a single, ready-to-use absolute URL for each image. It does not return `srcset`, width/height, aspect ratio, or alt text.

**How the URL is chosen** (`ResolvesMediaUrl`): for a requested size `S`, use variant `S-webp`; if that does not exist use `S-jpeg`; if neither exists the field is `null`. (WebP is preferred; JPEG is the fallback. AVIF is not generated.)

**Generated sizes** (`config/media.php`; longest edge, never upscaled):

| Variant | Max px | Used for |
|---|---|---|
| `thumbnail` | 300 | Brand logo (`site-settings.logo_url`), social link `logo_url` |
| `catalogue` | 800 | Artwork cards: `image_url` |
| `detail` | 1600 | Artist `portrait_url`, page-section `image_url`, exhibition `media[].url`, article `media[].url` |
| `full` | 2400 | Artwork detail `images[].url` (gallery / zoom / lightbox) |

Encoding: WebP quality 82, JPEG quality 85. Allowed uploads: JPEG, PNG, WebP (max 10 MB) — admin-side.

**Rules for the frontend**
- **Never construct media URLs.** They are produced by the configured storage disk (`/storage/...` locally; the disk can be swapped to a CDN/S3 without code changes). Use whatever host the API returns. Originals are never exposed.
- **URLs are opaque — do not parse or pattern-match them.** Files uploaded since Phase 12 live under `media/{id}/{random-token}/{variant}-{format}.{ext}` (the token makes images of drafts/inactive works unguessable); files uploaded earlier keep the shorter `media/{id}/{variant}-{format}.{ext}` path (the shape in this guide's examples). A file's URL never changes content, and nginx serves `/storage/` with `Cache-Control: public, max-age=86400`.
- **Image hosts are constrained by the CSP** (`img-src 'self' data: <media origin>`), where the media origin follows the storage disk URL. Do not load images from third-party hosts — they are blocked when the policy is enforced ([§24](#24-http-caching-cookies-security-headers-and-csp)).
- **Every image field is nullable.** Always render a fallback (the SPA's `ImageWithFallback` renders an empty grey box with `aria-hidden` when `src` is falsy).
- **Loading attributes (Phase 12):** `ImageWithFallback` renders `<img loading="lazy" decoding="async">` by default; pass `priority` for the one clearly above-the-fold image (it becomes `loading="eager"` + `fetchPriority="high"` — the first image on the artwork page uses it). `BrandMark` logos are `loading="eager"`. No `width`/`height` attributes are added, so reserve space with CSS.
- **Alt text is not provided by the API.** Derive it: artworks → `"{title} by {artist.name}"` (or just `title`), artists → full name, exhibitions/articles → title, social/brand → platform / brand text (see modes above).
- **No intrinsic dimensions** are returned → reserve space with CSS (`aspect-square`, `aspect-video`, or, for artworks, `width_cm / height_cm`) to avoid layout shift.
- `image_url` on cards is the image flagged `is_main`; if no image is flagged main it is `null` even when other images exist (detail `images[]` will still list them).
- Artwork detail's `images[].url` is the largest variant; do not use it in grids.

---

## 12. YouTube video

Present on: **artwork detail** (E8), **exhibition** items (E9, E10, and therefore `homepage.exhibition`). Not on artists, articles, pages or cards.

```json
"video": { "id": "Faw55XUneOM", "embed_url": "https://www.youtube-nocookie.com/embed/Faw55XUneOM" }
```

- `video` is **`null`** when no video is set (always check).
- `id` is the 11-character YouTube id (`[A-Za-z0-9_-]{11}`). `embed_url` uses the privacy-enhanced domain **`youtube-nocookie.com`**.
- Render via an `<iframe src={video.embed_url}>` — the SPA's `YoutubeEmbed` uses `aspect-video`, `loading="lazy"`, `allowFullScreen`, and an `allow` list (`accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share`), with the entity title as the iframe `title`.
- The API does **not** return a watch URL; if you need one, it is `https://www.youtube.com/watch?v={id}`.
- Admins paste a URL (watch, `youtu.be`, `embed`, or `shorts` forms are understood); only the extracted id is stored/exposed.

---

## 13. WhatsApp behaviour

Two independent sources:

1. **Artwork-specific link** — `whatsapp_link` on [E8](#e8-get-artworksinventorycode). Format:

   ```
   https://wa.me/{whatsapp_number}?text={rawurlencode("Salam, {title} ({inventory_code}) əsəri ilə maraqlanıram.")}
   ```

   - `{title}` falls back to the inventory code when the title is `null`.
   - The pre-filled message is **always Azerbaijani**, whatever `?locale` is.
   - Number source (Phase 12 behaviour): the site setting `whatsapp_number` reduced to its **digits only**; if that leaves nothing (never saved, or saved and later cleared), the env fallback `GALLERY_WHATSAPP_NUMBER` (also digits only) is used; if that is empty too, there is no link.
   - The admin API normalises the number to digits when it is saved (`+994 50 123-45-67` → `994501234567`), and the link builder re-normalises, so punctuation never reaches the `wa.me` URL.
   - `whatsapp_link` is `null` when no number is available → **hide the WhatsApp CTA**. The SPA shows `t('artwork.contactWhatsapp')` only when the link is truthy.

2. **Generic number** — `whatsapp_number` on [E14](#e14-get-site-settings), if you want a site-wide WhatsApp button. The SPA does not currently use it.

---

## 14. Artwork availability, price and enquiry behaviour

**Availability** (`availability`, enum): `available`, `reserved`, `sold`.

- All three appear in lists and on detail pages (sold works are **not** hidden).
- The SPA shows an uppercase status label under the card for any value other than `available` (`t('artwork.reserved' | 'artwork.sold')`).
- `status` filter on E7 accepts exactly these three values.
- `year_sold` exists in the database but is **not** exposed.

**Price**

- `price` and `currency` are both `null` when the gallery hides the price → show `t('artwork.priceOnRequest')`.
- Otherwise render `"{price} {currency}"`.
- Remember that price filters/sorting still use the hidden real price (E7).

**Enquiring about an artwork**

- The detail page embeds the enquiry form with `subject: "buy"` and `artwork_code: <inventory_code>` (E17).
- **Sold artworks:** by default the backend **rejects** enquiries for sold works with a `422` on `artwork_code` (Azerbaijani message *"Bu əsər üçün artıq sorğu qəbul edilmir."*). The API does not expose whether `ALLOW_SOLD_ENQUIRIES` is on, and the current `ArtworkDetailPage` shows the form regardless of availability, so a visitor of a sold work would submit and then see that error. *Recommendation (not current behaviour):* hide or replace the form for `availability === "sold"`, or handle the `artwork_code` error explicitly.
- `reserved` works accept enquiries.
- An unknown/inactive/deleted code (e.g. artwork deactivated while the page was open) → `422` on `artwork_code`.

---

## 15. Contact form and artwork enquiry form

Both post to [E17](#e17-post-enquiries) using the shared component `components/EnquiryForm.jsx` (props: `subject`, optional `artworkCode`).

### Artwork enquiry form (on `/artworks/{code}`)
- `<EnquiryForm subject="buy" artworkCode={data.inventory_code} />`.
- Payload: `name, email, phone, message, website, subject:"buy", artwork_code`.

### Contact form (on `/contact`)
1. `GET /enquiry-subjects?locale=…` (E16) → subject dropdown (subjects with a `null` label are dropped; the first labelled subject is preselected).
2. `<EnquiryForm subject={selectedKey} />` (no `artwork_code` — the SPA passes `undefined`, which `JSON.stringify` omits).
3. Payload: `name, email, phone, message, website, subject`.

> **Watch out:** E16 returns `buy` as the first subject. If the visitor keeps/chooses `buy` on the contact page, no `artwork_code` is sent and the backend answers `422` (`artwork_code` required when subject is buy). See [§22](#22-known-gaps-and-gotchas-in-the-current-implementation).

### Form behaviour (from `EnquiryForm`)
- States: `idle → submitting → success | rate-limited`. The button is disabled while submitting and after success/rate-limit. (After success the form is not reset; the user must reload to send another.)
- Success: green banner `t('enquiryForm.success')`.
- 422: `errors` stored; `errors.name[0]`, `errors.email[0]`, `errors.message[0]` shown under their fields; `error.message` shown in the banner. `phone`, `subject`, `artwork_code`, `_unexpected` are not shown next to a field.
- 429: banner `t('enquiryForm.rateLimited')`, form stays disabled.
- Network/other error: banner `t('common.error')`.
- Honeypot: see E17.
- The form has **no client-side validation** today (server is the source of truth). The `email` input is `type="email"`.

### Validation limits to mirror in the UI (optional, for better UX)
`name` ≤ 255 · `email` valid ≤ 255 · `phone` ≤ 30 · `message` ≤ 5000.

---

## 16. SEO and page metadata

There are **two layers** and they must be kept in sync.

### Layer 1 — server-rendered `<head>` (Laravel)

`routes/web.php` renders `resources/views/public.blade.php` for `/` and every path except `/admin*` and `/api*`, using `PublicPageSeoResolver`. The head contains: `<title>`, `meta description`, `canonical`, `robots`, Open Graph (`og:site_name/type/title/description/url/locale/image`), Twitter card, and JSON-LD.

- **Locale for the server head** is read from the **page URL's** `?locale=` query (`az` default, `en`). The SPA does not add `?locale` to its URLs, so a hard load/crawl is rendered in **AZ** unless someone links with `?locale=en`.
- `<html lang="az">` is fixed; the SPA never changes it on locale switch.
- **Title format:** `"{entity title} — ArtNiyyətli"`; home uses the hero heading as-is (or `ArtNiyyətli`).
- **Description:** tags stripped, trimmed, truncated to 160 chars; `null`-safe.
- **Canonical:** absolute URL built from `APP_URL` + path; **never includes** `?locale`. Each dynamic path segment is **percent-encoded** (Phase 12): a slug like `haqqımızda` becomes `haqq%C4%B1m%C4%B1zda`, and an inventory code containing a space or `?` becomes a single valid segment (`AN%2012%3Fx`). The same encoding is used by `og:url`, the JSON-LD URLs and the sitemap, so they always agree. Plain ASCII slugs/codes (`about`, `AN-2026-014`) are unchanged.
- **Caching of the shell:** the HTML is served with `Cache-Control: public, max-age=0, must-revalidate` and a weak `ETag` (a hash of the rendered document); a matching `If-None-Match` gets a body-less `304`. Because the response is cookie-free it is safe for a CDN to cache with revalidation.
- **Robots:** `index, follow` normally; `noindex, follow` and **HTTP status 404** (canonical falls back to `/`) for unknown entities/pages, for paths with 3+ segments, and for 2-segment paths that are not a known detail route.
- **Per-entity results:**

  | Path | Title source | OG image | JSON-LD |
  |---|---|---|---|
  | `/` | hero heading | first **featured** artwork's main image (`catalogue`) | `WebSite` + `Organization` (email/phone from settings) |
  | `/artworks` | label + count description | first artwork's main image (`catalogue`) | — |
  | `/artworks/{code}` | SEO override title or artwork title | override OG image, else main image (`full`) | `VisualArtwork` + `BreadcrumbList` |
  | `/artists`, `/exhibitions`, `/articles` | label + count description | — | — |
  | `/artists/{slug}` | override or full name | override OG image, else portrait (`detail`) | `Person` + `BreadcrumbList` |
  | `/exhibitions/{slug}` | override or title | override OG image only | `BreadcrumbList` |
  | `/articles/{slug}` | override or title | override OG image only; `og:type=article` | `Article` + `BreadcrumbList` |
  | `/{slug}` (CMS page) | override or page title | — | — |

- **SEO overrides:** admins can set a per-entity, per-locale title / description / OG image for pages, artworks, artists, exhibitions and articles. The server head honours them. **The public API does not expose them** (see below).
- The page-list labels ("Əsərlər", "Artworks", …) are **duplicated** in `App\Support\Seo\SeoLabels` (copied from `dictionary.js` `nav.*`). If you change those `nav.*` dictionary strings, update `SeoLabels` too.

### Layer 2 — client-side updates (`usePageMeta`)

`usePageMeta({ title, description, noIndex })` (in `lib/usePageMeta.js`) runs after each page renders data and:

- sets `document.title` (only if `title` is given);
- sets or **removes** `<meta name="description">`;
- sets `<meta name="robots" content="noindex, follow">` when `noIndex` is true, and **removes** the robots tag otherwise;
- sets `<link rel="canonical">` to `origin + pathname` (no query, no locale).

It does **not** touch Open Graph / Twitter tags, JSON-LD or `<html lang>`.

**What each page passes today:** Home → hero heading (or `ArtNiyyətli`) + hero body; catalogue/artists/exhibitions/articles → `"{nav label} — ArtNiyyətli"`; artwork → `"{title} — ArtNiyyətli"` + `short_description`; artist → `"{first} {last} — ArtNiyyətli"` + `biography`; exhibition → `title` + `short_text`; article → `title` + `short_text`; static page → `title` + `content`; not-found → `noIndex`.

**Frontend requirements / cautions**
1. Every routed page should call `usePageMeta`; not-found and any placeholder/error page should set `noIndex: true`.
2. Because the API does not return SEO overrides, the client update **replaces** the server-rendered title with the plain entity title after hydration. If an admin has set an override title/description, the browser tab (and any JS-rendering crawler) will show the non-override value. This is current behaviour, not a bug in your code — see [§21](#21-things-that-could-not-be-determined-from-the-repository).
3. Descriptions passed from the client are **not** truncated/stripped (e.g. the static page passes the whole `content`); the server head truncates to 160 chars. Consider truncating client-side for consistency.
4. Keep the `— ArtNiyyətli` title suffix format consistent with `SeoText::pageTitle`.

### `robots.txt` and `sitemap.xml`

- `GET /robots.txt`: `User-agent: *`, `Allow: /`, `Disallow: /admin`, `Disallow: /api`, and a `Sitemap:` line pointing to `/sitemap.xml`.
- `GET /sitemap.xml` (`application/xml`) lists: `/`; every **active non-home CMS page** (`/{az-slug}`, falling back to any locale's slug); every active artwork (`/artworks/{code}`); active artists; active exhibitions; **published** articles. Each has `<lastmod>` (except `/`). Every path segment is percent-encoded (Unicode slugs and unusual inventory codes are valid URLs). URLs are AZ-slug only; there is **no hreflang / alternate** markup, and the **list pages** (`/artworks`, `/artists`, `/exhibitions`, `/articles`) are **not** in the sitemap. The document is cached server-side (10 minutes, invalidated by any admin save); the sitemap is one file (no sitemap index; the site is nowhere near the 50 000-URL limit).

---

## 17. Public routes and URL structure

Defined by the SPA router (`lib/useRouter.js`); server side, every path below is served by the same Blade shell.

| Path | Page key | Component | Data |
|---|---|---|---|
| `/` | `home` | `HomePage` | E2 |
| `/artworks` | `catalogue` | `CataloguePage` | E7 (+ E5 for the artist filter) |
| `/artworks/:code` | `artwork-detail` | `ArtworkDetailPage` | E8, form → E17 |
| `/artists` | `artists` | `ArtistsPage` | E5 |
| `/artists/:slug` | `artist-detail` | `ArtistDetailPage` | E6 |
| `/exhibitions` | `exhibitions` | `ExhibitionsPage` | E9 |
| `/exhibitions/:slug` | `exhibition-detail` | `ExhibitionDetailPage` | E10 |
| `/articles` | `articles` | `ArticlesPage` | E11 |
| `/articles/:slug` | `article-detail` | `ArticleDetailPage` | E12 |
| `/contact` | `contact` | `ContactPage` | E16 → E17 |
| `/:slug` (any other single segment) | `static-page` | `StaticPage` | E4 |
| anything else (e.g. 3+ segments) | `not-found` | `NotFoundPage` | — |

**Matching rules:** routes are tried **in the order above**, segment count must match exactly, `:param` segments are `decodeURIComponent`-decoded, and the first match wins. Consequences:
- `/contact` is always the enquiry page; a CMS page whose slug is `contact`, `artworks`, `artists`, `exhibitions` or `articles` would be **shadowed** by the built-in route.
- The home CMS page is at `/`, not `/home` (though `/home` would render `StaticPage` for a page with that slug).
- Unknown single segments render `StaticPage`, which shows `NotFoundPage` when E4 returns `404`.

**Links & navigation:** use plain `<a href="/…">`. The router installs one global click handler that turns clicks on internal anchors (`href` starting with `/` but not `//`) into `history.pushState` navigation, and ignores links with `target="_blank"` or a modifier key (⌘/Ctrl/Shift/Alt) so those open normally. There is no `<Link>` component.

**URL shapes:** artworks use the **inventory code**; artists/exhibitions/articles/pages use **slugs**. The locale, catalogue filters, sort and page number are **not** in the URL today (they live in React state), so filtered/paginated views are not shareable and reload to defaults.

**Server-side routing of the shell** (`routes/web.php`): `GET /` and `GET /{any}` render the Blade shell for every path except those starting with `admin` or `api` (those get Laravel's normal 404). The shell answers **HTTP `404`** (with `noindex`) for paths the SEO resolver does not recognise — unknown pages/entities, paths with 3+ segments — while still loading the SPA, which renders its own `NotFoundPage`. `robots.txt` and `sitemap.xml` are separate routes.

**Slug rules (admin side, affects what you will see):** since Phase 12 slugs of pages, artists, artworks, articles and exhibitions must be letters/numbers joined by single hyphens (Unicode letters allowed, e.g. Azerbaijani), max 191 characters; a **page** slug (which becomes a top-level path) may additionally not be one of `admin`, `api`, `artworks`, `artists`, `exhibitions`, `articles`, `contact`, `storage`, `build`, `up`, `home`, nor start with `admin`/`api` (dots are not allowed, so `robots.txt`/`sitemap.xml` are impossible anyway). A record's own existing slugs are always accepted unchanged — that is why the structural pages can keep `home` and `contact`. **Inventory codes have no such rule** (any string up to 50 characters), so keep encoding path segments ([§22](#22-known-gaps-and-gotchas-in-the-current-implementation)).

---

## 18. What must be data-driven vs. what the frontend owns

### Must come from the API — never hardcode

- **Menus:** which items exist, their order, header/footer placement, and page titles (E1). Only the four route-key labels come from the dictionary.
- **Which CMS pages exist**, their slugs, titles and content, incl. legal pages (E1/E3/E4).
- **Branding:** brand text, logo, display mode (E14).
- **Social links:** platform names, URLs, logos, display modes, order, visibility (E15).
- **Contact block in the footer:** e-mail, phone, address, opening hours, footer text (E14).
- **Enquiry subjects** and their localized labels (E16).
- **WhatsApp:** the number and the artwork link (E14 / E8).
- **Home page copy, section order, section images** (E2 `page.sections`), FAQs, stats, wall/featured selections, the highlighted exhibition.
- **Currency:** use each card's `currency` (do not hardcode "AZN").
- **Artist names/ids for filters:** from E5.
- **Genre/medium names and slugs:** from the cards.
- **Availability state, price visibility, video presence, image URLs.**

### Owned by the frontend

- All UI strings in `i18n/dictionary.js`: labels for the four route keys, filter/sort labels, availability labels (`artwork.available|reserved|sold`), pagination text, form labels, success/error/rate-limit copy, "price on request", not-found copy, loading/empty text.
- The set of **sort options** (`newest`, `price_asc`, `price_desc`), **status filter options**, and **exhibition tabs** (`all`, `current`, `upcoming`, `archive`) — these mirror the API's accepted values.
- The route → page mapping and URL structure ([§17](#17-public-routes-and-url-structure)).
- Layout, typography, alt-text composition, placeholder rendering.
- The `— ArtNiyyətli` title suffix and the `ArtNiyyətli` fallback brand text (used only until/unless the API value arrives).

---

## 19. Existing frontend architecture and patterns to follow

Code lives in `resources/js/public/` (React 19 function components + hooks, Tailwind CSS v4 utility classes, Vite 8 build, Vitest 5; entry `main.jsx` → `#public-root`; CSS entry `resources/css/public.css`).

```
public/
  main.jsx                 mounts <App/> into #public-root
  App.jsx                  <LocaleProvider> → <SiteDataProvider> → useRouter → PAGES map → <SiteShell><Page/></SiteShell>
  layout/   SiteShell, Header, Footer, SiteDataContext (SiteDataProvider + useSiteData)
  pages/    HomePage, CataloguePage, ArtworkDetailPage, ArtistsPage, ArtistDetailPage,
            ExhibitionsPage, ExhibitionDetailPage, ArticlesPage, ArticleDetailPage,
            ContactPage, StaticPage, NotFoundPage
  components/  ArtworkCard, ArtistCard, ExhibitionCard, ArticleCard, FilterBar, Pagination,
               ImageWithFallback, YoutubeEmbed, EnquiryForm, BrandMark, SocialLinks,
               LocaleSwitcher, LoadingState, EmptyState, ErrorState
  services/    one small module per resource (articles, artists, artworks, enquiries,
               exhibitions, faqs, homepage, navigation, pages, siteSettings, socialLinks)
  lib/         api.js, useApiData.js, usePageMeta.js, useRouter.js
  i18n/        LocaleContext.jsx, dictionary.js
  __tests__/   Vitest + Testing Library specs
```

### The layering (follow it for any new feature)

1. **`lib/api.js`** — the only place that calls `fetch`.
   - `publicApiFetch(path, params)` → `GET /api/v1{path}?{params}` with `Accept: application/json`. It **drops** params whose value is `undefined`, `null` or `''`, so callers can pass optional values freely.
   - `publicApiPost(path, payload)` → JSON `POST`.
   - Both throw `PublicApiError(status, message, errors)` on non-2xx (`message` from `body.message` or `'Request failed.'`; `errors` from `body.errors` or `{}`; `isRateLimited` is `status === 429`). On success they return the parsed body (`{data, meta, links}`).
2. **`services/*.js`** — one function per endpoint, first argument `locale`, e.g. `listArtworks(locale, {page, artist, status, sort, price_min, price_max})`. No logic. Add new query params here.
3. **`useApiData(fetcher, deps)`** — returns `{ data, meta, loading, error }` where `data = body.data` and `meta = body.meta` (note: `links` is not exposed). It starts with `loading: true`, re-runs when `deps` change, and ignores stale responses (a `cancelled` flag). Always include `locale` in `deps`. Use a "retry token" in `deps` for retry buttons (see `CataloguePage`).
4. **Pages** — the standard skeleton (copy from any detail page):

   ```jsx
   const { locale } = useLocale();
   const { data, loading, error } = useApiData(() => getX(locale, params.slug), [locale, params.slug]);
   usePageMeta(data ? { title: `${data.title} — ArtNiyyətli`, description: data.short_text } : {});
   if (loading) return <LoadingState />;
   if (error?.status === 404) return <NotFoundPage />;
   if (error) return <ErrorState error={error} />;
   // lists also: if (data.length === 0) return <EmptyState />;
   ```

5. **`useRouter`** — tiny custom router; see [§17](#17-public-routes-and-url-structure). To add a route: add an entry to `ROUTES` (before `/:slug`), add the page to the `PAGES` map in `App.jsx` under the same key, create the page component, and add tests. `routing-completeness.test.jsx` asserts the listed page keys are mapped in `App.jsx`.
6. **i18n** — `useLocale()` gives `{locale, setLocale}`; `t(locale, 'group.key')` for static copy. Add every new string to **both** `az` and `en` in `dictionary.js`.
7. **State primitives** — reuse `LoadingState`, `EmptyState`, `ErrorState` (handles `isRateLimited`), `Pagination` (takes `meta`, hides itself when `last_page <= 1`), `ImageWithFallback`.
7a. **Shared shell data (Phase 12)** — `layout/SiteDataContext.jsx`: `SiteDataProvider` (rendered inside `LocaleProvider`, around the routed app) calls `getNavigation`, `getSiteSettings` and `listSocialLinks` **once per locale** through `useApiData` and exposes `{ navigation, settings, socialLinks }` via `useSiteData()`; each is its own `{ data, meta, loading, error }`, so one failing endpoint does not affect the others. `Header` and `Footer` read from it — **do not call these three endpoints from components again**; use `useSiteData()` (it throws outside the provider). Pages load only their own data.
8. **Cards** — `ArtworkCard` etc. render links as `<a href>` (router intercepts), use `ImageWithFallback`, and tolerate missing optional fields.

### Two shared, data-driven display components

- `BrandMark({logoUrl, displayMode, brandText, imgClassName, textClassName})` — the single implementation of the three display modes; used by Header, Footer and each social link.
- `SocialLinks({links, className, imgClassName, textClassName})` — renders the E15 array; returns `null` when empty.

### Testing pattern

- Vitest (`npm test` → `vitest run`), environment `jsdom`, globals on, setup file `resources/js/admin/testSetup.js`.
- Specs live in `resources/js/public/__tests__/`. They mock `global.fetch` (`vi.fn`) with a helper returning `{ ok, status, headers: { get: () => 'application/json' }, json: async () => body }`, then render inside `<LocaleProvider>` (and `<SiteShell>` where the shell matters) and assert with Testing Library.
- Service specs assert the exact URL, e.g. `expect(fetch).toHaveBeenCalledWith('/api/v1/social-links?locale=az', expect.anything())`.
- Note: if `.claude/worktrees/` exists, Vitest also discovers duplicate copies of the specs there (about 212 extra tests, about 526 in total, instead of this checkout's 314); that is repository noise. Use `npx vitest run --exclude '**/node_modules/**' --exclude '.claude/**'` ([§A](#a-frontend-developer-workflow)).

### Reuse before you build

Before writing new UI for an API field, check whether the pattern exists: pagination → `Pagination`; a YouTube block → `YoutubeEmbed`; a logo/text/both mark → `BrandMark`; social icons → `SocialLinks`; an enquiry form → `EnquiryForm`; empty/loading/error → the three primitives.

---

## 20. Enum reference

| Enum | Where it appears in the public API | Allowed values |
|---|---|---|
| `Locale` | `?locale` | `az`, `en` |
| `ArtworkAvailability` | `availability`; `status` filter (E7) | `available`, `reserved`, `sold` |
| `ArtworkImageType` | `images[].type` (E8) | `main`, `detail`, `frame`, `wall` |
| `ExhibitionStatus` | `status` (E9/E10). Filter param uses `current`, `upcoming`, `archive` (`archive` = `past`) | `current`, `past`, `upcoming` |
| `ExhibitionType` | `type` (E9/E10) | `exhibition`, `news`, `announcement` |
| `ExhibitionMediaType` | exhibition `media[].type` | `photo`, `video` |
| `ArticleType` | `type` (E11/E12) | `interview`, `video_project`, `art_article`, `exhibition_review`, `news`, `announcement` |
| `MediaType` | article `media[].type` | `image`, `video` |
| `PageType` | `type` (E3/E4) | `home`, `about`, `collectors`, `contact`, `custom` |
| `NavType` | navigation item `type` | `page`, `route` |
| `NavRouteKey` | navigation `route_key` | `artworks`, `artists`, `exhibitions`, `articles` |
| `NavPlacement` | keys of `data` in E1 | `header`, `footer` |
| `LogoDisplayMode` | `logo_display_mode` (E14); social `display_mode` (E15) | `logo_text`, `logo_only`, `text_only` |
| Enquiry subject key | `subject` (E16, E17) | `buy`, `general_contact`, `artist_submission`, `media`, `exhibition_invitation`, `collaboration` (`other` exists in the DB but is never listed and is rejected) |
| `ArticleStatus` | not exposed (only `published` is ever visible) | `draft`, `published` |
| `EnquiryStatus` | not exposed | `new`, `read`, `replied`, `closed` |

Build UI options from these values; do not assume that new values will never be added — render unknown enum values defensively (e.g. `t()` falls back to the key path).

---

## 21. Things that could not be determined from the repository

- **Production base URL / domain / CDN host.** Only the local Docker origin (`http://localhost:8080`) and `APP_URL` (env) are known. Media URLs come from the storage disk (`MEDIA_PUBLIC_DISK`); the production disk/host is not in the repository.
- **Production values of env-driven settings:** `APP_TIMEZONE` (affects the offset in `published_at`), `GALLERY_CURRENCY` (default `AZN`), `ALLOW_SOLD_ENQUIRIES` (default off), `PUBLIC_API_CORS_ORIGINS`, `GALLERY_WHATSAPP_NUMBER`, `ENQUIRY_NOTIFICATION_EMAIL`.
- **Whether the API will ever expose SEO overrides, media alt text, or price-range lists.** None of them is exposed today (price ranges exist as database tables but have no public endpoint). Genres and mediums are exposed since `b2bab8d` ([E18](#e18-get-genres), [E19](#e19-get-mediums)).
- **Tie-breaking for equal navigation `sort_order`** — the query orders by placement and `sort_order` only; the order of ties is not defined by the code.
- **Slug collisions across locales.** Uniqueness is enforced per `(slug, locale)`; a slug that is the AZ slug of one record and the EN slug of another would make the locale-agnostic lookup ambiguous (first match wins). No rule preventing this was found.
- **Server-side sanitisation of authored text** (`content`, `body`, `biography`, …). Nothing in the public API strips or escapes markup; treat as untrusted plain text.
- **Exact wording of validation messages beyond the ones captured here** — they are Laravel's defaults and may change with framework updates.
- **The deployed environment.** TLS/HSTS, the proxy/CDN in front of the site, whether `SECURITY_CSP=enforce` is actually set on the live server (the tracked `.env.production.example` sets it; the live `.env` is not in the repository), the production cache/limiter backend, and production data volumes are Phase 13 concerns and cannot be read from this repository.
- **Vite dev server reachability from a Windows browser when Node runs inside WSL**, and the exact Node version range Vite 8 requires (`package.json` has no `engines`). Setup in [B](#b-local-setup-docker-and-startup) was verified with Node 22.22.1.
- **`php artisan dev` / `composer dev`.** The command exists (`dev`, `dev:list`), but what processes it starts was not inspected and it is not part of the documented Docker workflow.
- **Whether real e-mail is delivered locally:** the notification uses whatever mailer the developer's `.env` configures; the SPA cannot observe delivery.
- **This guide was written from the code and live calls, using the previous version of this file only as a reading aid;** every statement was re-checked against the code at `88e5407`; the changes of `b2bab8d` were re-checked against that commit and live calls.

---

## 22. Known gaps and gotchas in the current implementation

These are facts observed in the current code — useful when you start work, and candidates for fixes.

1. **Contact form offers `buy` without an artwork code.** `GET /enquiry-subjects` includes `buy`; `ContactPage` lists every labelled subject and preselects the first one (`buy`). Sending it without `artwork_code` returns `422 artwork_code required`, which `EnquiryForm` shows only as a generic banner. Either exclude `buy` on the contact page or handle it.
2. **`EnquiryForm` does not surface all field errors** (`phone`, `subject`, `artwork_code`, `_unexpected`); only `name`, `email`, `message` render inline.
3. **Cross-origin POST is blocked by CORS by default.** The allow-list is `GET, HEAD, OPTIONS` unless the operator sets `PUBLIC_API_CORS_ALLOW_POST=true` (and lists your origin in `PUBLIC_API_CORS_ORIGINS`); a preflight for `POST /api/v1/enquiries` otherwise returns `Access-Control-Allow-Methods: GET, HEAD, OPTIONS` (verified). A frontend served from a different origin (e.g. `localhost:5173`) therefore cannot submit enquiries without that backend change. The current SPA is same-origin, so it works — develop against `http://localhost:8080`.
4. ~~6 shell API calls per page load~~ **Resolved in Phase 12:** the shell now makes 3 calls (`SiteDataProvider`, [§19](#19-existing-frontend-architecture-and-patterns-to-follow)). Keep it that way — do not re-introduce per-component fetches of `navigation` / `site-settings` / `social-links`.
5. **Sold artworks show the enquiry form** even though the backend rejects such enquiries by default ([§14](#14-artwork-availability-price-and-enquiry-behaviour)).
6. **`/contact` ignores the CMS "contact" page content.** `ContactPage` shows the form only; `GET /pages/contact` is never called.
7. **Artist `slug` can still be `null` outside the artist list.** Since `b2bab8d`, [E5](#e5-get-artists) and `homepage.artists` only return artists with a usable AZ slug, but `artists[]` inside exhibitions (E10) is not filtered and can carry `slug: null`; guard those links.
8. **Locale, filters and page are not in the URL**, and `<html lang>` never changes; the server head is AZ unless the page URL carries `?locale=en`.
9. **Client `usePageMeta` overwrites server-rendered SEO overrides** with plain entity titles/descriptions ([§16](#16-seo-and-page-metadata)).
10. **`services/artworks.js` doesn't forward `genre`, `medium`, `per_page`, `size_min`, `size_max`;** `services/articles.js` doesn't forward `per_page`; `listFaqs` is unused.
11. **`ArtworkDetailPage` reads `data.artist.name`** without optional chaining in the subtitle (`<p>{data.artist.name}</p>`); the detail endpoint always includes `artist`, so this works, but keep the `?.` pattern used elsewhere if you refactor.
12. **404 body is `{ "message": "" }`** in production — don't display `error.message` for 404s (the SPA renders `NotFoundPage` instead).
13. **Price sorting/filtering uses hidden prices** ([E7](#e7-get-artworks)) — a known follow-up / security consideration, still unfixed.
14. **Rate-limit headers:** `X-RateLimit-Remaining` is available on every response if you want to throttle your own request bursts.
15. **Slugs and codes are interpolated into URLs without `encodeURIComponent`.** `services/*.js` build `` `/artists/${slug}` `` / `` `/artworks/${inventoryCode}` `` and the cards/pages build `href`s the same way. Browsers percent-encode spaces and Unicode automatically, and the router decodes route params, so Azerbaijani slugs work. But an inventory code containing `?`, `#`, `/` or `%` (the admin accepts any string up to 50 characters) would break both the API call and the link. If you touch these files, wrap path segments in `encodeURIComponent` (the server already encodes them in canonical URLs and the sitemap). A code containing `/` can never resolve at all (it splits into extra path segments).
16. **Inline `style` in `EnquiryForm` (honeypot).** The honeypot wrapper uses `style={{ position:'absolute', left:'-9999px' }}`. This is allowed under the enforced CSP because React applies style objects through the CSSOM (not an inline `style` *attribute* in HTML); do not replace it with HTML strings, `dangerouslySetInnerHTML`, or a `<style>` tag ([§24](#24-http-caching-cookies-security-headers-and-csp)).
17. **Cached responses can look stale for up to 60 s** after an admin edit (browser `max-age`); this is intended ([§24](#24-http-caching-cookies-security-headers-and-csp)).
18. **The dev database has content gaps** (artists without translations — now hidden from the public artist list, genres/mediums without names, no exhibitions/articles/wall/featured items, a dangling `logo_url: null` with a stored `logo_media_id`). Test the empty and `null` paths; do not "fix" them by editing data unless that is the point of your task.

---

## 23. Authentication boundary: public API vs admin API

| | Public site + public API | Admin |
|---|---|---|
| Paths | `GET /`, `GET /{any}`, `GET /robots.txt`, `GET /sitemap.xml`, **`/api/v1/*`** | `GET /admin` (the admin SPA shell) and the JSON API **`/admin/*`** |
| Who | Anonymous visitors | Signed-in staff with role `administrator` or `editor` (user management: `administrator` only); the account must be active |
| Session / cookies | **None.** No session, no `Set-Cookie`, no CSRF (verified on `/`, `/artworks`, `/collectors`, `/api/v1/homepage`) | Session cookie + `XSRF-TOKEN` cookie; every write needs the `X-XSRF-TOKEN` header |
| Unauthenticated / forbidden | n/a | JSON `401` (not signed in) and `419` (missing/invalid CSRF token) — both verified live; `403` for a signed-in user without permission is enforced by the route gates (covered by the backend test suite, not re-probed here) |
| Throttling | 60/min/IP (+ 5/hour/IP for `POST /api/v1/enquiries`) | Login: 5 attempts/min per username+IP and 20/min per IP; admin writes 240/min/user; media upload 20/min/user |
| Stability | **The contract this guide documents.** | Internal to the admin SPA. **Not part of the public contract**; not documented here, may change. |

Rules for the public frontend:

1. **Never call `/admin/*` from the public SPA.** Everything the public site needs is in `/api/v1`. The public API never returns admin-only data (no `is_active`, timestamps, internal notes, enquiry data, storage paths, `year_sold`, `featured`/`show_on_wall` flags, or unpublished/inactive/deleted records).
2. **Do not send credentials** (`credentials: 'include'`) or an `X-XSRF-TOKEN` to the public API; none is needed and the API grants no extra access for them.
3. The public API **cannot create, change or delete content** — the only write is `POST /api/v1/enquiries`, which creates an enquiry record and nothing else.
4. Content edited in the admin appears in the public API immediately on the server (the server-side caches are flushed on every admin save) and in browsers within `PUBLIC_API_CACHE_TTL` (60 s).

---

## 24. HTTP caching, cookies, security headers and CSP

Everything here is enforced by the backend; the frontend must be compatible with it.

### Caching and `ETag`

| Response | `Cache-Control` | Validators |
|---|---|---|
| Public API `GET` `200` (all 18 read endpoints) | `public, max-age=60` (env `PUBLIC_API_CACHE_TTL`; `0` disables; optional `stale-while-revalidate` via `PUBLIC_API_CACHE_SWR`, default off) | strong `ETag` (a hash of the body) + `Vary: Accept-Encoding` (and `Origin` for CORS). `If-None-Match` matching the `ETag` → **`304 Not Modified`**, empty body. |
| Public API errors (`404`, `405`, `422`, `429`) and `POST /enquiries` | `no-cache, private` | none — never cached |
| Public HTML shell (`/`, `/artworks`, …) | `public, max-age=0, must-revalidate` | weak `ETag` (hash of the rendered document) → `304` |
| `/build/assets/*` (hashed JS/CSS/fonts) | `public, max-age=31536000, immutable` | — |
| `/build/manifest.json`, `/favicon.ico` | none set (revalidated) | `ETag`/`Last-Modified` from nginx |
| `/storage/*` (media variants) | `public, max-age=86400` | `ETag`/`Last-Modified` |
| `robots.txt`, `sitemap.xml`, `/admin` | `no-cache, private` | — |

What this means for you:

- **You do not implement any conditional-request logic.** The browser's `fetch` revalidates automatically; a `304` is delivered to your code as the cached `200`.
- **Do not add cache-busting query params** or `cache: 'no-store'` to normal calls — you would defeat the 60-second cache and burn the rate-limit budget. Use them only for debugging.
- **Edits made in the admin can take up to 60 s to reach a browser** that already fetched that URL. Design UI that tolerates it; do not poll to "see changes faster".
- **Only `200 GET` responses without cookies are cacheable**; error responses are not, so a `429` or `404` is never stored.
- Compression: nginx gzips HTML, JSON, JS, CSS, XML and SVG (`Vary: Accept-Encoding`); images/fonts are not re-compressed. No brotli.
- **Hashed assets are immutable.** Never reference `/build/assets/...` by hand — always load through the `@vite` tag / manifest, since the file names change on every build.

### Cookies and sessions

The public site sets **no cookies** (no session, no `XSRF-TOKEN`, no analytics) — there is no consent banner to build. `localStorage` is used only for the locale preference (`public-locale`), in a `try/catch`.

### Security headers (every response — HTML, API, errors, 404/422/429)

Set by the application (`App\Http\Middleware\SecurityHeaders`, `config/security.php`):

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` (the site cannot be embedded in another site's frame) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` — do not use those browser features |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Strict-Transport-Security` | `max-age=31536000`, **only** on HTTPS requests and only when `SECURITY_HSTS=true` (off by default) |
| `Content-Security-Policy` | see below |

The server no longer advertises `X-Powered-By` or an nginx version (after the app image is rebuilt).

### Content-Security-Policy — what your code must respect

Policy (verified against the live header):

```
default-src 'self'; script-src 'self'; style-src 'self';
img-src 'self' data: <media origin>; font-src 'self'; connect-src 'self';
frame-src https://www.youtube-nocookie.com;
base-uri 'self'; form-action 'self'; object-src 'none';
frame-ancestors 'self'          (added only in enforce mode)
```

- **Mode:** `SECURITY_CSP=report-only` locally by default (the header is `Content-Security-Policy-Report-Only`: violations appear as `[Report Only]` messages in the console but nothing is blocked). **`.env.production.example` sets `enforce`**, so in production violations are blocked. The header is **not sent at all while the Vite dev server runs** (`public/hot` exists), so a violation can be invisible in HMR mode — **before finishing a change, also run `npm run build` and load it at `http://localhost:8080` with the console open**, checking for `[Report Only]`/CSP messages.
- The whole current site — every public route, the YouTube embeds, the API calls and the admin — was verified with **zero violations** enforced and report-only in Phase 12.
- **Rules that follow:**
  - **No inline scripts, no `eval`/`new Function`, no inline event-handler attributes, no external script hosts** (`script-src 'self'`). Import code through Vite. (The JSON-LD `<script type="application/ld+json">` in the server-rendered head is a data block and is not affected.)
  - **No `<style>` elements or `style="..."` HTML attributes** (`style-src 'self'`). Use Tailwind utility classes / `resources/css/public.css`. React `style={{…}}` props are fine (applied via the CSSOM, verified), but string-injected markup with inline styles is not.
  - **Fonts must be same-origin** (`font-src 'self'`): no Google Fonts / CDN font links. (Neither shell currently loads a web font; the Vite fonts plugin generates self-hosted files in `public/build` if you wire them in.)
  - **Images:** same origin, `data:` URIs, or the media origin (the storage disk URL). No third-party image hosts.
  - **`fetch`/XHR/WebSocket only to the same origin** (`connect-src 'self'`): no third-party analytics or APIs.
  - **The only allowed iframe host is `https://www.youtube-nocookie.com`** — use the API's `embed_url`; a plain `youtube.com` iframe or any other embed is blocked.
  - **Forms submit only to the same origin** (`form-action 'self'`); `<base>` only to self; no `<object>`/`<embed>`.
- If you genuinely need a new source, **ask the backend owner** to change the policy (`SecurityHeaders::policy()`); never work around it, and never add `'unsafe-inline'` or `'unsafe-eval'`.
- Unrelated console messages you will see on pages with a YouTube embed (`Unrecognized feature: 'web-share'`, `No available adapters`) come from YouTube's own player, not from the policy.

### CORS

Same-origin use needs nothing. For a separately hosted frontend see [§2](#2-general-api-conventions) and [C](#c-environment-variables): production allows **no** origin by default, `POST` is off unless `PUBLIC_API_CORS_ALLOW_POST=true`, the allowed request headers are only `Accept`, `Content-Type`, `X-Requested-With`, and no `Access-Control-Expose-Headers` are configured (a cross-origin script cannot read `X-RateLimit-*` / `Retry-After`).

---

## 25. Production build and deployment notes

What is verifiable from the repository (the actual production infrastructure is **not** in the repository — [§21](#21-things-that-could-not-be-determined-from-the-repository)):

- **Build:** `npm ci && npm run build` produces `public/build/` (hashed assets + `manifest.json`, `fonts-manifest.json`). It is git-ignored: production either builds on deploy or ships a pre-built `public/build`. The Blade shell (`@vite([...])`) resolves file names through the manifest, so the shell and the assets must come from the same build. Expected build output at `88e5407` (Vite 8): the public entry is `main-*.js` (~33 kB, 8 kB gzip) + the shared `jsx-runtime-*.js` chunk (~219 kB, 68 kB gzip) + `public-*.css` (~58 kB, 12 kB gzip).
- **Same origin is the deployment model.** The SPA is served by Laravel from the same origin as `/api/v1`, and it calls the API with **relative URLs**. Do not introduce an absolute API base URL or a separate host without a coordinated backend change (CORS, cookies-free POST, CSP `connect-src`, rate-limit IP handling).
- **`APP_URL` must be the public HTTPS origin.** It drives media URLs, canonical URLs, `og:*`, JSON-LD and the sitemap. A wrong `APP_URL` shows up as images loading from the wrong host and as wrong canonicals.
- **Security config that ships with production:** `SECURITY_CSP=enforce` (`.env.production.example`), HSTS opt-in (`SECURITY_HSTS`), `TRUSTED_PROXIES` for the real proxy/CDN so rate limiting uses the client IP, no CORS origins. `php artisan app:preflight --strict` checks the environment before a release (backend owner's task).
- **Static delivery (nginx, `docker/nginx/default.conf`):** gzip on, hashed assets `immutable` for a year, `/storage` variants cached one day, uploaded scripts under `/storage` denied, version banners off. This config lives in the repo but production edge/CDN behaviour is Phase 13.
- **Cache invalidation on deploy:** hashed asset names change per build; the shell's `ETag` changes with them, so browsers pick up a new build on the next revalidation. Nothing to purge manually. After data changes made outside the admin run `php artisan public-cache:flush`.
- **Before you hand a change over,** run `npm test`, `npm run build`, and load the built site at `http://localhost:8080` with the console open (CSP and network errors), on both locales and on mobile widths.
- **Health check:** `GET /up` returns `200` when the application boots (framework route).

---

## 26. Out of scope: what does not exist

These are **not implemented**. Do not build UI that assumes them, and do not document them as available:

- **Online payments / checkout / cart / accounts / login for visitors.** Enquiries are the only conversion path.
- **Search** (no search endpoint) and **facet/count endpoints**; no endpoint lists price ranges (genres and mediums: [E18](#e18-get-genres) / [E19](#e19-get-mediums)); no size bands/presets (use `size_min` / `size_max`).
- **Public endpoints for SEO overrides, media alt text or image dimensions/`srcset`.** Alt text and sizing are the frontend's job ([§11](#11-images-media-urls-and-variants)).
- **Rich text / HTML content.** `content`, `body`, `biography`, `full_text` are plain text; no sanitiser exists — never render as HTML.
- **hreflang / localized URLs.** The locale is not in the URL; the server-rendered head is Azerbaijani unless the page URL carries `?locale=en`.
- **Server-side rendering of page bodies.** Only the `<head>` is server-rendered ([§16](#16-seo-and-page-metadata)); crawlers that do not run JavaScript do not see page content.
- **Enquiry follow-up on the public side** (status, replies, tracking) — the public API returns no enquiry data; replies are sent by e-mail from the admin.
- **Password reset, 2FA, SSO, or any public authentication.**
- **Cookie-consent / analytics tooling.**
- **A sitemap index, image sitemap, or per-locale sitemaps.**
- **Push/real-time updates** (no websockets, no SSE); the API is request/response only.
- **API versioning beyond `/v1`, and any API-contract change** — the contract in this guide is fixed for the frontend work; changes are made by the backend owner.
- **Phase 13 / infrastructure** (production images, CI/CD, TLS, CDN/WAF, Redis, queue workers, backups, monitoring, S3) — not part of this repository state.

---

## 27. Appendix: curl cheat sheet

Local Docker base: `http://localhost:8080/api/v1`

```bash
# Menus, brand, socials, subjects
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/navigation?locale=az'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/site-settings'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/social-links'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/enquiry-subjects?locale=en'

# Home + content
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/homepage?locale=en'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/pages'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/pages/about?locale=en'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/faqs'

# Catalogue (and its filter lists)
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/genres?locale=en'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/mediums'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/artworks?price_max=1000&size_min=50&size_max=150'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/artworks?status=available&sort=price_asc&price_min=100&price_max=5000&per_page=12&page=1'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/artworks?artist=3&genre=abstract&medium=oil-on-canvas'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/artworks/AN-2026-014?locale=en'

# People, shows, journal
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/artists'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/artists/leyla-mammadova?locale=en'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/exhibitions?filter=archive&page=1'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/exhibitions/yeni-nefes'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/articles?per_page=6'
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/articles/leyla-mammadova-ile-musahibe'

# Enquiry (creates a real record on a live stack — and counts against the 5/hour limit!)
curl -s -X POST 'http://localhost:8080/api/v1/enquiries' \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","message":"Hello","subject":"general_contact","website":""}'

# Non-API public routes
curl -s 'http://localhost:8080/robots.txt'
curl -s 'http://localhost:8080/sitemap.xml'

# Cache validators and conditional requests (expect: Cache-Control max-age=60, an ETag, then 304)
curl -sI 'http://localhost:8080/api/v1/faqs' | grep -i -E '^(HTTP|cache-control|etag|x-ratelimit)'
curl -s -o /dev/null -w '%{http_code}\n' -H 'If-None-Match: "<etag from the previous call>"' 'http://localhost:8080/api/v1/faqs'

# No cookies on public pages / security headers on every response
curl -sI 'http://localhost:8080/' | grep -i -E '^(set-cookie|x-frame|x-content|referrer|permissions|cross-origin|content-security)'

# gzip + immutable caching of a built asset
curl -sI -H 'Accept-Encoding: gzip' "http://localhost:8080/build/assets/<a hashed file from public/build/assets>" | grep -i -E '^(content-encoding|cache-control)'

# Validation / error shapes (never cached)
curl -s -H 'Accept: application/json' 'http://localhost:8080/api/v1/artworks?status=bogus'
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: application/json' 'http://localhost:8080/api/v1/artworks/DOES-NOT-EXIST'
```

**Cheat-sheet cautions:** every call above counts against the 60/min/IP budget, and the enquiry POST also counts against the 5/hour/IP limit (and creates a real record and a real e-mail on a stack with a live mailer) — do not loop over them.

---

*End of guide. It describes the repository at commit `88e5407` (end of Phase 12). If you change the API, or anything the frontend depends on (headers, CSP, caching, limits), update this document in the same change — it is meant to describe the repository as it currently is.*
