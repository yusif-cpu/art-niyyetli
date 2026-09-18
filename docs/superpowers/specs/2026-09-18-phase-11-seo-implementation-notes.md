# Phase 11 SEO — Implementation Notes

This document describes **only what is actually implemented and running today**, verified directly against the code in this repository (Tasks 1–20 of `docs/superpowers/plans/2026-09-18-phase-11-seo.md`, all committed). Where useful, it points at the exact file responsible for a behavior rather than restating the plan.

---

## 1. What was built

**`App\Services\Seo\PublicPageSeoResolver`** (`app/Services/Seo/PublicPageSeoResolver.php`) is the server-side heart of this phase. Given a set of URL segments and a `Locale`, its `resolve()` method returns a `PageSeo` value object (`app/Support/Seo/PageSeo.php`: `title`, `description`, `canonicalUrl`, `index`, `follow`, `ogType`, `ogImageUrl`, `ogLocale`, `jsonLd`, `httpStatus`) by querying the database directly — the same models and scoping every `App\Http\Controllers\Api\V1\*` controller already uses — never inventing copy. It is called from a shared closure in `routes/web.php` (`$renderPublicShell`) that both the `/` route and the public catch-all `/{any}` route use, and its output is rendered into real `<head>` tags by `resources/views/public.blade.php`. This is what makes crawlers and social-link-preview bots, which generally do not execute JavaScript, see correct, entity-specific metadata on a hard load.

**`usePageMeta`** (`resources/js/public/lib/usePageMeta.js`) is the client-side counterpart: a small hand-rolled hook (`useEffect` + `document.title` / meta-tag DOM upserts, no dependency) that keeps the `<head>` correct during in-app, client-side navigation, since the SPA never reloads between pages and the server-injected tags would otherwise stay frozen at whatever the first page was. It is wired into all 11 public page components (`resources/js/public/pages/*.jsx`, Tasks 14–18) using the same data each page already fetches for its own render.

**`robots.txt` / `sitemap.xml`** are live, dynamic routes: `App\Http\Controllers\RobotsController` and `App\Http\Controllers\SitemapController`, registered in `routes/web.php` ahead of the catch-all. `robots.txt` allows `/`, disallows `/admin` and `/api`, and references the sitemap via `App\Support\Seo\SeoText::absoluteUrl()` (never a hardcoded domain). `sitemap.xml` lists the homepage plus every active static page, artwork, artist, exhibition, and published/visible article — each URL built from that entity's `az`-locale slug (falling back to any translation if `az` is missing), consistent with the "no locale in the URL" rule already baked into the routing.

**The `SeoMetadata` override wiring** — `App\Support\Seo\Concerns\HasSeoOverride` (added to `Artwork`, `Artist`, `Exhibition`, `Article`, `Page`) exposes `seoOverride(Locale $locale): ?SeoMetadata`, which every detail-page resolver method checks first via `$entity->seoOverride($locale)` before falling back to derived content (`$override?->title ?? $fields['title']`, etc.). The table (`App\Models\SeoMetadata`, polymorphic via `seoable_type`/`seoable_id`) already existed from Phase 02; this phase only added the read side. There is still no admin UI to write these rows (see §3).

**Artwork image `alt` text** (Task 19, `resources/js/public/components/ArtworkCard.jsx` and `resources/js/public/pages/ArtworkDetailPage.jsx`) now includes artist context — `"{title} by {artist name}"`, falling back to the title alone when there's no artist — closing the one gap found when auditing image usage against the spec's "title/artist context" wording.

---

## 2. Per-page-type metadata rules

All titles (except home) go through `SeoText::pageTitle()`, which appends `" — ArtNiyyətli"` to a non-empty entity title, or returns the bare site name if there is none. All descriptions go through `SeoText::description()`, which `strip_tags()`s and truncates to 160 characters via `Str::limit()`, returning `null` if the source field is empty — the description meta tag is then omitted entirely rather than synthesized. List-page descriptions (catalogue/artists/exhibitions/articles) are the one exception: they are short, live-count sentences built directly (`"{$count} əsərdən ibarət kataloqu kəşf edin."` etc.), not run through `SeoText::description()`, since they are already short, plain, and locale-branched at the call site.

| Route (`useRouter.js` page id) | Title source | Description source | JSON-LD | `og:type` | Index/follow |
|---|---|---|---|---|---|
| `/` (`home`) | Homepage hero section's `heading` (used **as-is**, not through `pageTitle()` — it's already the brand statement), else the bare site name | Hero section's `body` | `WebSite` + `Organization` | `website` | `index, follow` |
| `/artworks` (`catalogue`) | `SeoLabels::label($locale, 'artworks')` | Live count of active artworks | none | `website` | `index, follow` |
| `/artworks/:code` (`artwork-detail`) | `SeoMetadata` override title ?? artwork title | Override description ?? `short_description` | `VisualArtwork` + `BreadcrumbList` | `website` | `index, follow` |
| `/artists` (`artists`) | `SeoLabels::label($locale, 'artists')` | Live count of active artists | none | `website` | `index, follow` |
| `/artists/:slug` (`artist-detail`) | Override title ?? artist's full name | Override description ?? `biography` | `Person` + `BreadcrumbList` | `website` | `index, follow` |
| `/exhibitions` (`exhibitions`) | `SeoLabels::label($locale, 'exhibitions')` | Live count of active exhibitions | none | `website` | `index, follow` |
| `/exhibitions/:slug` (`exhibition-detail`) | Override title ?? exhibition title | Override description ?? `short_text` | `BreadcrumbList` **only** — no `Event` type (see §3) | `website` | `index, follow` |
| `/articles` (`articles`) | `SeoLabels::label($locale, 'articles')` | Live count of published, active, past-`published_at` articles | none | `website` | `index, follow` |
| `/articles/:slug` (`article-detail`) | Override title ?? article title | Override description ?? `short_text` | `Article` + `BreadcrumbList` | `article` — the **only** page that isn't `website` | `index, follow` |
| `/:slug` (`static-page`) | Override title ?? page title | Override description ?? `content` | none | `website` | `index, follow` |
| any unresolved path (`not-found`) | Bare site name (no entity title) | none | none | `website` | `noindex, follow`, HTTP `404` |
| `/admin` (separate SPA shell, not resolver-driven) | Static `"ArtNiyyətli — Admin"` | — | — | — | `noindex, nofollow` (static tag in `admin.blade.php`) |

Detail-page lookups all follow the same pattern: find the translation row by slug (across any locale — matching `staticPage()`'s and every other detail method's precedent), then load the parent scoped by its own "publicly visible" rule (`is_active = true`, plus `status = published` and `published_at <= now()` for articles), and 404 (`notFound($locale)`) if either step fails. `notFound()` always sets `index: false` but `follow: true`, and canonicalizes to `/` — this is a real HTTP `404` (Task 10), not a soft 404 that still returns `200`. Every canonical URL ignores query strings by construction: the path segment Laravel's route captures never includes the query string, so an externally-appended `?utm_source=...` never produces a different canonical.

---

## 3. Known, accepted limitations

These are real, verified constraints of the current architecture — not bugs, and not deferred without reason:

- **Server-rendered metadata always defaults to `az` unless the request URL includes `?locale=en`.** A returning visitor's `localStorage`-persisted locale preference (`resources/js/public/i18n/LocaleContext.jsx`) cannot be read by the server on the very first request — there is no locale cookie, and this phase does not add one (that would be a real architecture change, out of scope). This mirrors the public API's own existing default (`App\Support\Api\LocaleResolver::resolve()`).
- **`SeoLabels` (`app/Support/Seo/SeoLabels.php`) duplicates four label pairs from `resources/js/public/i18n/dictionary.js`'s `nav.*` keys**, because there is no shared-code layer between the PHP backend and the JS frontend. If the dictionary's nav labels ever change, `SeoLabels` must be updated to match, or the server-rendered `<title>` for a list page will disagree with the client-rendered `<h1>`.
- **There is no admin UI for writing `SeoMetadata` override rows.** An operator can currently only populate them via `php artisan tinker`. Reading/consuming them is fully wired up and tested; a future phase could add an admin screen for editing them without any further backend change.
- **Catalogue/exhibitions/articles filter and pagination state is not reflected in the URL today** (verified: `CataloguePage.jsx`'s `filters`/`page`, `ExhibitionsPage.jsx`'s `filter`/`page`, and `ArticlesPage.jsx`'s `page` are all plain `useState`), so there is currently exactly one canonical URL for each of these three pages, always `index, follow`. If a future change starts reflecting filters in the URL, the corresponding resolver branch and its indexability rule must be revisited.
- **Exhibition detail pages get a `BreadcrumbList` only, not an `Event` JSON-LD type.** This was reviewed and confirmed as final during Phase 11 planning, not deferred: there is no ticketing, attendance-mode, or structured start/end-time data that would make `Event` markup meaningful. Add it in a future phase only if a concrete, documented schema requirement justifies it.
- **`og:type` is `article` only for article details, and `website` everywhere else** — deliberately never `product`, since that Open Graph type requires declaring an XML namespace on `<html>` that nothing else in this codebase uses.
- **The client-side `usePageMeta` hook does not `strip_tags()`/truncate its `description`** the way the server-side `SeoText::description()` does — it passes each page's raw field (`short_description`, `biography`, `short_text`, `content`) straight through. This is a deliberate, accepted duplication cost of not introducing SSR (documented in the plan's Architectural decision #2): the server-rendered metadata is what a non-JS crawler actually sees on a hard load; the client hook only keeps things reasonably correct during in-app navigation.
- **`usePageMeta` must be called unconditionally on every render, before any early-return guard**, in any page component that has one (`if (loading) return ...`, etc.). This app never remounts a page component on a locale switch (no `key={locale}` anywhere in `App.jsx`'s routing), so a component that has already rendered past its guards once (calling the hook) and then gets a same-instance re-render that hits an early return before reaching the hook again violates React's Rules of Hooks and crashes (`"Rendered more hooks than during the previous render"`) — reproduced and fixed during Tasks 14–18. When a page's title/description depends on `data` that might still be `null`, call it as `usePageMeta(data ? { title: ..., description: ... } : {})`, never move the call itself behind a guard.

---

## 4. How to add SEO support for a brand-new public page

1. Add a branch to `PublicPageSeoResolver::resolve()`'s `match`, mirroring whatever route pattern you already added to `resources/js/public/lib/useRouter.js`'s `ROUTES` table (e.g. `count($segments) === 2 && $segments[0] === 'new-thing' => $this->newThingDetail($segments[1], $locale)`), and a corresponding private method that: looks up the entity, 404s via `$this->notFound($locale)` if it isn't publicly visible, resolves localized fields via `LocalizedFields::resolve()`, checks `$entity->seoOverride($locale)` first, and returns a `PageSeo` built the same way every existing detail method is (see §2's table for the pattern to copy).
2. If the new entity should appear in `sitemap.xml`, add a matching private method to `SitemapController` following the same "active-scoped, translation-slug-derived `loc`" shape as `artworks()`/`artists()`/etc.
3. In the new page component (`resources/js/public/pages/NewThingPage.jsx`), import `usePageMeta` and call it **unconditionally**, before any early-return loading/error guard (see the last bullet in §3) — e.g. `usePageMeta(data ? { title: \`${data.title} — ArtNiyyətli\`, description: data.short_text } : {})`.
4. Add/update tests: a `PublicPageSeoResolverTest.php` case for the new resolver branch, a `PublicPageHttpTest.php` case if it affects the rendered shell directly, and a "sets document.title from ..." Vitest case in the page's own test file, following the pattern used throughout Tasks 5–18.

---

## 5. Verification commands

```bash
php -d memory_limit=1024M ./vendor/bin/phpunit             # full backend suite
./vendor/bin/pint --test                                    # PHP style check, no modification
npx vitest run                                               # full frontend suite (admin + public)
npm run build                                                # production build

# with the Docker stack up (docker compose ps healthy):
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/                          # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/artworks/does-not-exist    # 404
curl -s http://localhost:8080/ | grep -o '<title>[^<]*</title>'                            # real, dynamic title
curl -s http://localhost:8080/robots.txt
curl -s http://localhost:8080/sitemap.xml
```

Note: the manual `curl` step against the live stack matters — it is not redundant with the PHPUnit suite. `RobotsTest.php`/`SitemapTest.php` (and every other feature test) issue requests through Laravel's HTTP kernel directly, bypassing nginx entirely. During Task 20's sweep, this manual step caught a stale static `public/robots.txt` (a leftover from the original Docker scaffold commit) that nginx's `try_files` was serving directly, permanently shadowing the dynamic `/robots.txt` route in the real deployed app — a class of bug the PHPUnit suite structurally cannot see. If a future change adds another fixed-path route (another controller registered ahead of the `/{any}` catch-all), re-run this manual check specifically, not just the test suite.
