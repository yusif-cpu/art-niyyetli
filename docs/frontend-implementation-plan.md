# ArtNiyyətli — Public Frontend Implementation Plan (demo design → live API)

> **Status (2026-09-28): implemented.** The plan below was carried out in ten stages on `frontend`, last commit `c2456d9`; §11 records each stage with its commits, where we left the plan and why, and what is still open. The sections 0–10 are kept as written (the plan of record); read them with §11. A summary in Azerbaijani is in `docs/frontend-yekun.md`.
> **Branch / commit:** written at `frontend` @ `88e5407` (`chore: finalize phase 12 security hardening`); **updated for `3b3e806`** (`docs: update frontend api guide`), which brings `b2bab8d` (genre/medium lists, size filter, `price_max` fix, artist AZ-slug rule, wall cap), `2c64176` (homepage sections by key) and `23ce451` (collectors page unlisted).
> **Date:** 2026-09-25; updated 2026-09-26. What changed at `3b3e806` is summarised in §0.1; the status of the six open questions S1–S6 is in §9.3.
> **Inputs read:**
> - `demo-frontend/ArtNiyyetli.html`, decoded from its bundler wrapper; see §1.1.
> - `docs/frontend-current-api-guide.md`, checked against the code.
> - `resources/js/public/**`, `resources/css/public.css`, `resources/views/public.blade.php`, `routes/web.php`, `routes/api.php`, `app/Http/**`, `config/security.php`, `package.json`, `vite.config.js`, `AGENTS.md`, `CLAUDE.md`, `README.md`.
>
> **Conventions:**
> - `file:line` references point at the repository.
> - `template:NNNN` refers to lines of the decoded demo page source (see §1.1).
> - Anything not confirmed from code or from a run is marked **unverified**.

---

## Contents

0. [Preconditions and environment findings](#0-preconditions-and-environment-findings)
1. [Sources and how they were read](#1-sources-and-how-they-were-read)
2. [Stage 1 — Inventory of the existing public frontend](#2-stage-1--inventory-of-the-existing-public-frontend)
3. [Stage 2 — Mapping: demo sections → components → endpoints](#3-stage-2--mapping-demo-sections--components--endpoints)
4. [Stage 3 — Gaps and conflicts](#4-stage-3--gaps-and-conflicts)
5. [Stage 4 — Wall ("real size") specification](#5-stage-4--wall-real-size-specification)
6. [Stage 5 — Design tokens, fonts and CSP](#6-stage-5--design-tokens-fonts-and-csp)
7. [Stage 6 — Impact on tests](#7-stage-6--impact-on-tests)
8. [Stage 7 — Work plan](#8-stage-7--work-plan)
9. [Stage 8 — Risks and open questions](#9-stage-8--risks-and-open-questions)
10. [Appendix — API guide vs. code discrepancies](#10-appendix--api-guide-vs-code-discrepancies)
11. [Execution status (2026-09-28)](#11-execution-status-2026-09-28)

---

## 0. Preconditions and environment findings

| Check | Result |
|---|---|
| Current branch | `frontend` ✔ |
| Tracked files | Clean. |
| Untracked files | 3 items, all inputs to this task and not produced by it:<br>• `demo-frontend/`<br>• `docs/frontend-current-api-guide.md`<br>• `docs/superpowers/specs/frontend-current-api-guide.md:Zone.Identifier`, a Windows download marker that should be deleted or ignored and never committed. |
| Node / npm on host (WSL) | **Not installed.** A portable Node 22.20.0 was unpacked into a temporary directory outside the repo to take the baseline. Frontend work needs Node on the host: the API guide §B says the Docker images contain no Node. |
| Docker daemon | Not running at the time of research. The backend could not be called live, so all API facts in this document come from code. |
| `npm test` | **62 files, 309 tests, 309 passed** (see §2.8). |
| `npm run build` | **Fails with `EACCES: permission denied, unlink public/build/assets/admin-…css`.**<br>• Cause: `public/build/` and its contents are owned by `root` from an earlier build, and the developer user is `meymun`.<br>• Nothing was deleted; the old build is intact.<br>• One-time fix, run by the owner: `sudo chown -R meymun:meymun public/build`.<br>• Until then, the rule "`npm run build` must pass after each stage" cannot be met. |
| Build warning | `[plugin laravel:fonts] Optimized font fallbacks require the optional "fontaine" package`. Harmless, but see §6.3. |
| `CLAUDE.md` / `AGENTS.md` | Both contain only the Laravel Boost bootstrap block. It asks to install `laravel/boost` before any application change.<br>• That needs PHP and Composer. They are not on the host; they exist only inside the `app` container.<br>• It would also modify `composer.json` and `composer.lock`, which are backend files.<br>• **Not done.** This is a decision for the owner (see §9, Q-ENV-1). |
| `.claude/worktrees/` | **Does not exist** (`git worktree list` shows only the main tree).<br>• The API guide's figure of "521 tests, ~212 duplicated from `.claude/worktrees/subject-driven-enquiries/`" (guide:129, guide:1494) is stale.<br>• **309 is the real count.** |

> **Superseded at `3b3e806` (2026-09-26):**
> - **Untracked files:** the `:Zone.Identifier` marker is deleted and the old copy of the guide is removed. This plan is committed. Only `demo-frontend/` stays untracked, pending a separate decision.
> - **Node:** still not installed in WSL. The re-run used a portable Node 22.20.0 in `/tmp`, outside the repo.
> - **Docker:** Docker Desktop's WSL integration for Ubuntu was off, so the containers bind-mounted an empty directory. After the owner enabled it, `docker compose up -d` + `docker compose restart app webserver` (to remount) brought the stack up at `http://localhost:8080`. **The migration `2026_09_26_000001_unlist_collectors_page` is applied** (`migrate:status`: no pending).
> - **Live checks after the migration:**
>   - `GET /api/v1/pages/collectors` → 404, and `/collectors` → 404.
>   - Collectors is absent from `GET /pages`, `GET /navigation` and `sitemap.xml`.
>   - `price_max=1000` alone → 200, `size_max=50` alone → 200, and `size_min=100&size_max=50` → 422.
>   - Homepage section keys: `hero`, `steps`, `cta`.
>   - The dev database returns `{"data":[]}` for `/genres` and `/mediums` and an empty `wall`. So the lookup shape and the 16 cap are confirmed from code and tests, not from live data.
> - **Tests:** `npx vitest run --exclude '**/node_modules/**' --exclude '.claude/**'` gives **62 files, 315 tests, 315 passed**, which matches the guide. See §2.8.
> - **Laravel Boost:** closed. The guide (§B) says Boost is not a project dependency and must not be installed. `composer.json` and `composer.lock` contain no `boost` entry, so the block in `CLAUDE.md`/`AGENTS.md` is boilerplate to ignore (Q-ENV-1).

### 0.1 Backend changes at `3b3e806` that affect this plan

| Change | Effect on this plan |
|---|---|
| `GET /api/v1/genres`, `GET /api/v1/mediums` (`GenreController`, `MediumController`, `LookupResource`) | G-2 is resolved. The `janr`/`texnika` options come from these endpoints. Each returns `{data: [{slug, name, sort_order}]}`: active rows only, ordered by `sort_order` then `id`, not paginated, and `name` localised with an AZ fallback (it can be `null`). |
| `size_min` / `size_max` on `GET /artworks` | G-1a is resolved. The filter uses the **larger side**, `max(width_cm, height_cm)`, in **cm**, with **inclusive** bounds. Each bound can be sent alone. `size_max < size_min` → 422. |
| `price_max` may be sent alone | D-1 / R-8 / Q-B-5 (first half) are resolved. The "always send `price_min=0`" workaround is no longer needed. |
| Homepage `wall` capped at **16** (`config('gallery.wall_limit')`, env `GALLERY_WALL_LIMIT`) | R-4 / Q-B-2 (limit half) are resolved. The frontend `WALL_MAX` is no longer needed; render up to 16 and tolerate fewer. |
| Artists without a usable AZ slug are hidden from `GET /artists` and `homepage.artists` | `slug` is never `null` in those two lists. It can still be `null` in exhibition `artists[]`. |
| `HomePage.jsx` finds `hero`, `steps`, `cta` **by key** (`2c64176`) | §2.2 and §3.2 are updated. Keys are still free admin data, not a backend enum (Q-C-1 stays open). |
| Collectors page unlisted (`23ce451` + migration) | It is inactive, has no navigation item, and `/collectors` returns 404. Nothing to build; the collectors layout is dropped from §3.2, §4.3 and §8. |
| Endpoint count **19** (18 GET + 1 POST) | §10 is updated. |

---

## 1. Sources and how they were read

### 1.1 The demo file

`demo-frontend/ArtNiyyetli.html` is 8,116,953 bytes. It is a Claude Design bundler wrapper, not a normal HTML page.

**How it is packaged:**
- `<script type="__bundler/manifest">` holds 56 base64 resources. Some of them are gzipped.
- `<script type="__bundler/template">` holds the real page as a JSON string of about 190 KB.
- An inline loader script decodes everything into `blob:` and `data:` URLs at runtime.
- The decoded template is 3,158 lines. It uses a proprietary templating syntax (`<x-dc>`, `sc-if`, `sc-for`, `x-import`).
- Its logic lives in one class, `Component extends DCLogic`, in `<script type="text/x-dc">` (template:1849–3156).
- Components come from a bundled design-system script, `ArtNiyyTliDesignSystem_1076d0`, of about 2,000 lines. Every component styles itself with inline style objects.

**Manifest contents:**
- 8 JPEG artworks
- 1 hero PNG, 1536×1024
- 2 logo PNGs
- 41 `woff2` font subsets
- React/ReactDOM **18.3.1** UMD
- The design-system runtime

**Consequence:** none of the demo's code can be reused directly. The demo is a **visual and behavioural specification**, and it is reimplemented in the existing React 19 app.

### 1.2 The API guide

The guide is accurate on:
- endpoint count
- fields
- enums
- pagination
- rate limits
- CORS
- cache TTLs
- the CSP string

§10 lists the few places where the code disagrees with it.

---

## 2. Stage 1 — Inventory of the existing public frontend

**Stack:**
- React 19 and Vite 8.
- Tailwind v4 through `@tailwindcss/vite`. There is no `tailwind.config.*`.
- Vitest 5 with jsdom.
- No router library, no state library, no UI kit.
- Entry points: `resources/js/public/main.jsx` renders `App` into `#public-root`.
- Component tree: `LocaleProvider > SiteDataProvider > RoutedApp` (`App.jsx:44-52`).

### 2.1 Routing — `lib/useRouter.js`

Routes are matched first-match-wins (`useRouter.js:3-15`):

| Path | Page key → component |
|---|---|
| `/` | `home` → `HomePage` |
| `/artworks` | `catalogue` → `CataloguePage` |
| `/artworks/:code` | `artwork-detail` → `ArtworkDetailPage` |
| `/artists` | `artists` → `ArtistsPage` |
| `/artists/:slug` | `artist-detail` → `ArtistDetailPage` |
| `/exhibitions` | `exhibitions` → `ExhibitionsPage` |
| `/exhibitions/:slug` | `exhibition-detail` → `ExhibitionDetailPage` |
| `/articles` | `articles` → `ArticlesPage` |
| `/articles/:slug` | `article-detail` → `ArticleDetailPage` |
| `/contact` | `contact` → `ContactPage` |
| `/:slug` | `static-page` → `StaticPage` (any single segment, e.g. `/about`) |
| anything else | `not-found` → `NotFoundPage` |

**How routing works:**
- It uses the History API (`pushState`, `popstate`).
- A document-level click listener turns every `<a href="/…">` into an SPA navigation (`useRouter.js:56-72`). There is no `<Link>` component.

**Defects relevant to the redesign:**
- **Query strings break routing.**
  - `navigate(href)` calls `matchPath(path)` on the raw href (`useRouter.js:53`).
  - So `/artworks?genre=x` becomes a single segment, `artworks?genre=x`, and matches `/:slug`, which renders StaticPage.
  - On a full reload only `pathname` is read, so the query string is ignored.
- **No scroll-to-top on navigation.** The demo's `go()` always calls `window.scrollTo(0,0)` (template:2397).

### 2.2 Pages (`pages/`)

**Behaviour shared by every page:**
- Every page calls `useLocale()` and `useApiData(fetcher, deps)`.
- No page syncs state to the URL.
- Page titles follow the pattern `X — ArtNiyyətli`.

| Page | Endpoint(s) and params | Renders (in order) | States |
|---|---|---|---|
| `HomePage.jsx` | `GET /homepage?locale` | • **Since `2c64176`:** sections are looked up **by key** (`findSection(page, key)`), never by position: `hero` → **h1** + body (also the document title `"{hero.heading} — ArtNiyyətli"` and the description), `steps` → h2 block under it, `cta` → h2 block at the bottom of the page. **Other keys are ignored.** Empty heading/body parts are skipped. `image_url` is still ignored.<br>• `exhibition` → ExhibitionCard<br>• `wall` → ArtworkCard grid<br>• `featured` → ArtworkCard grid<br>• `artists` → ArtistCard grid<br>• `faqs` → `<dl>` | loading, error. `stats` and `social_links` are **not used**. |
| `CataloguePage.jsx` | `GET /artists?locale` (filter options) and `GET /artworks?locale&page&artist&status&sort&price_min&price_max` | h1, FilterBar, grid, Pagination | loading, error (with retry), empty. Filters live in `useState`; they are not in the URL. A filter change resets the page to 1. |
| `ArtworkDetailPage.jsx` | `GET /artworks/{code}?locale` | • `images[]` gallery (first image eager), YouTube<br>• title, artist, `short_description`, `provenance`<br>• `width_cm × height_cm cm, year_created`<br>• WhatsApp link<br>• `EnquiryForm subject="buy"`<br>• `similar[]` | loading, 404 → NotFound, error. **Not rendered:** price, currency, availability, genre, medium, `certificate`, `frame_condition`, `delivery_note`, `images[].type`. |
| `ArtistsPage.jsx` | `GET /artists?locale` | ArtistCard grid | loading, error, empty |
| `ArtistDetailPage.jsx` | `GET /artists/{slug}?locale` | portrait, name, `direction`, `biography`, `artistic_approach`, `exhibitions[]`, `awards[]`, `artworks[]` | loading, 404, error. `birth_year` and `birth_place` are unused. |
| `ExhibitionsPage.jsx` | `GET /exhibitions?locale&filter&page` | tabs (all, current, upcoming, archive), ExhibitionCard grid, Pagination | loading, error, empty |
| `ExhibitionDetailPage.jsx` | `GET /exhibitions/{slug}?locale` | title, dates, venue, `full_text`, `media[]`, video, `artists[]`, `artworks[]` | loading, 404, error |
| `ArticlesPage.jsx` | `GET /articles?locale&page` | ArticleCard grid, Pagination | loading, error, empty |
| `ArticleDetailPage.jsx` | `GET /articles/{slug}?locale` | title, date, first media, `content` (plain text, `pre-wrap`) | loading, 404, error |
| `ContactPage.jsx` | `GET /enquiry-subjects?locale` | subject `<select>` + `EnquiryForm` (no artwork code) | loading, error |
| `StaticPage.jsx` | `GET /pages/{slug}?locale` | title, `content`, `sections[]` | loading, 404, error |
| `NotFoundPage.jsx` | — | h1 + text, `noindex` | — |

### 2.3 Components (`components/`)

| Component | Props | API fields read |
|---|---|---|
| `ArtworkCard` | `artwork` | `inventory_code`, `image_url`, `title`, `artist.name`, `price`, `currency`, `availability`. Price is shown raw (`"3200 AZN"`). Does **not** read `width_cm`, `height_cm`, `genre` or `medium`. |
| `ArtistCard` | `artist` | `slug`, `portrait_url`, `first_name`, `last_name`, `direction` |
| `ExhibitionCard` | `exhibition` | `slug`, `media[0].url`, `title`, `start_date`, `end_date`, `venue` |
| `ArticleCard` | `article` | `slug`, `media[0].url`, `title`, `short_text` |
| `ImageWithFallback` | `src, alt, className, priority` | Placeholder div when `src` is empty. `<img>` is lazy by default and eager when `priority`. No width or height attributes. |
| `BrandMark` | `logoUrl, displayMode, brandText, …` | Handles the `logo_text`, `logo_only` and `text_only` display modes. |
| `SocialLinks` | `links, …` | `platform`, `url` (http(s) only), `display_mode`, `logo_url` |
| `LocaleSwitcher` | — | AZ/EN buttons with `aria-current` |
| `FilterBar` | `artists, filters, onChange` | artist (id), status, sort, `price_min`, `price_max` (number inputs, not debounced). **No genre or medium filter.** |
| `Pagination` | `meta, onPageChange` | `current_page`, `last_page`, `total` |
| `EnquiryForm` | `subject, artworkCode` | Posts `name`, `email`, `phone`, `message`, `subject`, `artwork_code`, and the honeypot `website`. Handles 201, 422 (per-field errors), 429 and network errors. The honeypot is hidden with a React `style={{…}}` (`EnquiryForm.jsx:69`). |
| `LoadingState` / `EmptyState` / `ErrorState` | — | Text only. ErrorState shows the rate-limit text on 429. |
| `YoutubeEmbed` | `video, title` | `video.embed_url` |

### 2.4 Layout (`layout/`)

**`SiteDataContext.jsx`** loads three resources globally, re-fetched on locale change (`SiteDataContext.jsx:18-20`):
- `GET /navigation`
- `GET /site-settings`
- `GET /social-links`

**`Header.jsx`:**
- BrandMark, fed from settings `logo_url`, `logo_display_mode` and `brand_text`.
- `navigation.header[]` items:
  - `type:'page'` uses `title` as the label.
  - `type:'route'` uses `t('nav.'+route_key)` as the label.
- SocialLinks and LocaleSwitcher.
- **No mobile menu.**

**`Footer.jsx`:**
- BrandMark and `footer_text`.
- `contact_email`, `phone`, `address` and `opening_hours`.
- SocialLinks.
- `navigation.footer[]`, rendered under a hard-coded `aria-label="Legal"`.

**`SiteShell.jsx`:** Header, then `<main>`, then Footer.

### 2.5 Services (`services/`)

All GET calls go to `/api/v1…` with `locale`. None send `per_page`. Slugs and codes are interpolated **without `encodeURIComponent`**.

| Function | Endpoint | Extra params |
|---|---|---|
| `getNavigation` | `/navigation` | — |
| `getSiteSettings` | `/site-settings` | — |
| `listSocialLinks` | `/social-links` | — |
| `getHomepage` | `/homepage` | — |
| `getPage` | `/pages/{slug}` | — |
| `listArtists` / `getArtist` | `/artists`, `/artists/{slug}` | — |
| `listArtworks` / `getArtwork` | `/artworks`, `/artworks/{code}` | `page`, `artist`, `status`, `sort`, `price_min`, `price_max` |
| `listExhibitions` / `getExhibition` | `/exhibitions`, `/exhibitions/{slug}` | `page`, `filter` |
| `listArticles` / `getArticle` | `/articles`, `/articles/{slug}` | `page` |
| `listFaqs` | `/faqs` | — (**unused** by any page) |
| `getEnquirySubjects` | `/enquiry-subjects` | — |
| `submitEnquiry` | `POST /enquiries` | JSON body, no locale |

### 2.6 `lib/`

**`api.js`:**
- `PublicApiError(status, message, errors)`, with `isRateLimited` set when the status is 429.
- `buildQueryString` drops `undefined`, `null` and `''`.
- `publicApiFetch` and `publicApiPost`.
- No AbortController, retry or timeout.

**`useApiData.js`:**
- `useApiData(fetcher, deps)` returns `{data, meta, loading, error}`.
- A `cancelled` flag ignores stale responses.
- No cache and no refetch function; retry works by bumping a deps token.

**`usePageMeta.js`:**
- Sets `document.title`, `meta[name=description]`, `meta[name=robots]` (noindex) and `link[rel=canonical]`.
- Does **not** update `og:*` or `twitter:*`. Those come only from the server-rendered Blade head.

**`useRouter.js`:** see §2.1.

### 2.7 i18n

**`LocaleContext.jsx`:**
- Locale lives in `localStorage['public-locale']` and is either `az` or `en`. The default is `az`.
- There is no URL prefix.
- `<html lang="az">` is hard-coded in Blade and never updated.

**`dictionary.js`:**
- `t(locale, path)` falls back to `az`, then to the key itself.
- `az` and `en` have **identical key sets: 11 groups, 53 keys each.**

| Group | Keys |
|---|---|
| `nav` | 5 |
| `common` | 6 |
| `pagination` | 3 |
| `artwork` | 7 |
| `artist` | 2 |
| `enquiryForm` | 7 |
| `notFound` | 2 |
| `home` | 4 |
| `filters` | 10 |
| `exhibitions` | 5 |
| `contact` | 2 |

- Four keys are unused: `common.readMore`, `common.backToList`, `artwork.enquire` and `nav.faqs`.
- Some strings are hard-coded and untranslated: the honeypot label, `aria-label="Legal"`, `aria-label="Language"`, and the `" by "` in image alt text.

### 2.8 Styling and baseline tests

**Styling today:**
- `resources/css/public.css` is 8 lines: `@import 'tailwindcss'` plus `@source` rules.
- **No `@theme`, no tokens and no `@font-face`.** The public site uses the system font stack on `bg-white text-neutral-900`, with neutral Tailwind utilities only.

**Test baseline** at `3b3e806` (`npx vitest run --exclude '**/node_modules/**' --exclude '.claude/**'`, Node 22.20.0; per-file counts from `--reporter=json`). At `88e5407` it was 309 (193 public + 116 admin).

| Area | Files | Tests | Passed |
|---|---|---|---|
| Public (`resources/js/public/__tests__/`) | 34 | **198** | 198 |
| Admin (`resources/js/admin/**/__tests__/`) | 28 | **117** | 117 |
| **Total** | **62** | **315** | **315** |

Changes since `88e5407`:
- `HomePage` went from 5 to 9 tests (section-by-key cases).
- `App` went from 4 to 5 (`/collectors` → not-found). Its static-page case now uses `/about`.
- `SiteShell` still has 4, but the collectors nav link was removed from its fixtures.
- Admin `ArtistsScreen` gained 1 test.

**Public tests per file:**

| File | Tests | File | Tests | File | Tests |
|---|---|---|---|---|---|
| App | 5 | ArticleDetailPage | 4 | ArticlesPage | 2 |
| ArtistDetailPage | 4 | ArtistsPage | 3 | ArtworkCard | 6 |
| ArtworkDetailPage | 10 | BrandMark | 6 | CataloguePage | 5 |
| ContactPage | 3 | EnquiryForm | 6 | ExhibitionDetailPage | 5 |
| ExhibitionsPage | 3 | HomePage | 9 | ImageWithFallback | 4 |
| LocaleContext | 4 | LocaleSwitcher | 1 | NotFoundPage | 1 |
| Pagination | 4 | SiteDataContext | 10 | SiteShell | 4 |
| SocialLinks | 24 | StaticPage | 5 | YoutubeEmbed | 4 |
| api | 6 | dictionary | 3 | domain-cards | 6 |
| enquiries-service | 5 | routing-completeness | 1 | services | 15 |
| state-primitives | 8 | useApiData | 5 | usePageMeta | 6 |
| useRouter | 11 | | | | |

**Worktree duplication:** there is no `.claude/worktrees/` copy, so nothing is double-counted. Vitest has no `test.exclude` (`vite.config.js:33-37`), so the duplication would return if such a folder reappeared. Adding `exclude: [...configDefaults.exclude, '.claude/**']` is a cheap safeguard for stage 1.

---

## 3. Stage 2 — Mapping: demo sections → components → endpoints

**Status legend:**
- **var** — the component exists; only styling changes.
- **dəyişir** — the component exists, but its logic or data source changes.
- **yoxdur** — a new component is needed.

### 3.1 Global chrome

| Demo section | Existing component | Endpoint / field | Status |
|---|---|---|---|
| Sticky top bar, transparent over hero then Bone after scroll (template:1076–1096) | `Header.jsx` | — | **dəyişir**: needs scroll-aware state, hero overlay mode and a mobile menu (none today). |
| Logo (dark, or ivory over the hero) | `BrandMark` | `/site-settings`: `logo_url`, `logo_display_mode`, `brand_text` | **dəyişir**. Only one logo URL exists. The ivory variant over the hero needs a second asset, or a CSS treatment, or no overlay (§9 Q-D-3). |
| Nav: ana səhifə, əsərlər, rəssamlar, sərgilər, jurnal | `Header.jsx` | `/navigation` → `header[]` `{type:'page', title, href}` or `{type:'route', route_key, href}`. Route keys: artworks, artists, exhibitions, articles. | **var** (data already API-driven). The demo's "jurnal" is the `articles` route key; the label comes from the dictionary. The item count is variable. |
| Active nav item (Signal + 1px underline). Work detail counts as catalogue; artist detail counts as artists. | `Header.jsx` | `useRouter().page` | **dəyişir**: active-state logic does not exist yet. |
| Instagram, Facebook | `SocialLinks` + `BrandMark` | `/social-links` `{platform, url, display_mode, logo_url}` | **var** (styling only) |
| Language switch "AZ / EN" | `LocaleSwitcher` | client-side locale, `localStorage` | **var** (restyle as a text strip; keep buttons and `aria-current`) |
| Fixed bottom bar: context label + Zəng / WhatsApp / Müraciət (template:2897–2917) | — | `site-settings.phone`, `site-settings.whatsapp_number` (or artwork `whatsapp_link`); on the detail page the label uses `title` and `width_cm × height_cm` | **yoxdur** (`StickyContactBar`) |
| Footer: logo, tagline, address, 3 columns (navigation, artists, contact), © line | `Footer.jsx` | `/site-settings`: `footer_text`, `address`, `phone`, `contact_email`, `opening_hours`. `/navigation` `footer[]`. The artist names column has no global source (see §4.2 G-7). | **dəyişir** |
| Breadcrumb `əsərlər / artist / title` | — | detail data | **yoxdur** (`Breadcrumb`, small) |

### 3.2 Home (`/`)

| Demo section | Existing component | Endpoint / field | Status |
|---|---|---|---|
| Hero: full-bleed image, h1, lead, 3 buttons, side note | `HomePage` renders the `hero` section (found by key) as h1 + body | `/homepage` → `page.sections[]` `{key, heading, body, image_url}`. The hero is the section with key `hero`, a seeder convention and not a backend enum (guide E2 *Section keys*). Button labels and targets are not in the API. | **dəyişir**: a new `HomeHero` that reads `image_url` (currently ignored). Keep the by-key lookup and the "hero missing" fallback. Keys beyond `hero`/`steps`/`cta` still need agreement (§9 Q-C-1). |
| Stats band (4 cells) | — | `/homepage` → `stats {artists, artworks, exhibitions}`. The demo's 4th cell (`AZ · EN / iki dildə`) and its "2027 / first sale show" cell are copy, not stats. | **yoxdur** (`StatsBand`). Three cells can be data-driven; the rest need a CMS section or must be dropped. |
| **The wall** ("Divar" / "Səkkiz əsər, həqiqi ölçüdə"): pinned horizontal wall, 170 cm figure, counter | ArtworkCard grid under `home.wall` | `/homepage` → `wall[]` (ArtworkCardResource), ordered by `sort_order`, **capped server-side at 16** (`HomepageController.php:62-64`, `config/gallery.php` `wall_limit`). | **yoxdur** (`HomeWall`, `HumanFigure`, `lib/wallScale.js`; see §5). The heading must not hard-code "Səkkiz" (eight); derive it from `wall.length` or use CMS copy. |
| Exhibition act (bordo band: date label, big title, text, "Sərgi haqqında →") | `ExhibitionCard` | `/homepage` → `exhibition` (full ExhibitionResource: `title`, `start_date`, `end_date`, `venue`, `short_text`, `slug`, `media[]`) or `null` | **dəyişir** (`HomeExhibitionAct`). Hide it when `null`. Note that the field can be a `news` or `announcement` type (§10). |
| Collection act ("Kolleksiya", 6 cards in a hand-set staggered layout) | ArtworkCard grid under `home.featured` | `/homepage` → `featured[]` (max 6) | **dəyişir**. The demo layout (`fourPlan`: 76/40/28/54/32/62% widths) assumes exactly 6 items and needs a rule for 0–5. Cards show a dims badge, which needs `width_cm` and `height_cm`. |
| Artists accordion (4 columns, artwork image background, "N əsər", name, born · city, discipline) | ArtistCard grid under `home.artists` | `/homepage` → `artists[]`: `first_name`, `last_name`, `birth_year`, `birth_place`, `direction`, `portrait_url` | **yoxdur** (`ArtistAccordion`). There is no per-artist artwork count and no representative artwork image (§4.2 G-6). Fallback: use `portrait_url`, then a Bone field with initials. |
| "Əsər necə alınır" (4 steps), "Yanaşma" (3 pillars), "İlk dəfə alırsınız", CTA | — | **No dedicated endpoint.** The home page already has `steps` and `cta` sections (rendered by key since `2c64176`); more copy needs extra home sections by key. `/pages/collectors` is **no longer an option** (inactive, 404 since `23ce451`). | **yoxdur** (`StepList`, `Pillars`, `CtaBand`). The key set for pillars and the "first time buying" block needs a decision (§9 Q-C-1). |
| FAQ list | `<dl>` in HomePage | `/homepage` → `faqs[]` | **dəyişir**. The demo puts FAQs on the collectors screen, which is not part of the site, so FAQs stay on home. |

### 3.3 Catalogue (`/artworks`)

| Demo section | Existing component | Endpoint / field | Status |
|---|---|---|---|
| Page head: label, h1, lead, count "8 / əsər kataloqda" | `CataloguePage` h1 | Count from `meta.total` | **dəyişir** (derive the count; do not hard-code it) |
| Filter `rəssam` | `FilterBar` artist select | `artist` = artist **id**. Options from `GET /artists`. | **var** (restyle) |
| Filter `janr` | — | `genre` = slug (accepted, `PublicArtworkIndexRequest.php:20`). Options from **`GET /genres`** (`{slug, name, sort_order}`, since `b2bab8d`). Hide or slug-label entries whose `name` is `null`. | **yoxdur** (UI only; the data source exists) |
| Filter `texnika` | — | `medium` = slug (accepted). Options from **`GET /mediums`** (same shape). | **yoxdur** (UI only; the data source exists) |
| Filter `qiymət aralığı` (presets `<3000`, `3000–8000`, `>8000`) | FilterBar has two free number inputs | `price_min`, `price_max`, both inclusive. **Each can be sent alone since `b2bab8d`.** Priceless works drop out of any price filter in both the demo and the API. | **dəyişir** (preset select mapped to min/max; the preset values need a decision) |
| (not in demo; client requirement) Filter `ölçü` | — | `size_min`, `size_max` in cm on the **larger side** `max(width_cm, height_cm)`, inclusive, each optional (since `b2bab8d`). No presets or bands exist in the API. | **yoxdur** (UI; the band thresholds need a decision, e.g. small/medium/large mapped to min/max) |
| Filter `status` (satışda / rezerv edilib / satılıb) | FilterBar status select | `status` = `available` \| `reserved` \| `sold` | **var** |
| Sort `sıralama` (ən yeni, qiymət ↑, qiymət ↓) | FilterBar sort select | `sort` = `newest` \| `price_asc` \| `price_desc`; the default is gallery `sort_order`. **`newest` means `created_at desc`**, whereas the demo sorts by `year` (§9 Q-P-3). | **var** (restyle) |
| Active-filter chips + "hamısını sil" | — | client state | **yoxdur** (`FilterChip`, small) |
| Result label "N əsər" | — | `meta.total` | **yoxdur** (tiny) |
| Scaled grid: every card sized from cm on a shared scale, bottom-aligned | ArtworkCard grid (square crops) | `width_cm`, `height_cm`, `image_url` (catalogue variant) | **dəyişir**: new `ScaledArtworkGrid`; ArtworkCard gets a "field" sized by the parent (§5.4). |
| Card meta: artist / *title* (Spectral italic) / "medium · dims" / price + status badge / "Genre · code" | `ArtworkCard` | `artist.name`, `title`, `medium.name`, `width_cm × height_cm`, `price`, `currency`, `availability`, `genre.name`, `inventory_code` | **dəyişir**: reads 5 more fields. Prices need formatting (`6 400 AZN`). |
| Empty state + "Filtri sıfırla" | `EmptyState` | — | **dəyişir** (add a reset action) |
| (not in demo) Pagination | `Pagination` | `meta` (per_page default 24, max 60) | **var**. The demo has no pagination because it holds only 8 works; the real catalogue needs it. |
| (not in demo) URL-synced filters | — | query string | **yoxdur**. Needed so filtered views can be shared and survive reloads. Depends on the router fix in §2.1. |

### 3.4 Artwork detail (`/artworks/:code`)

| Demo section | Existing component | Endpoint / field | Status |
|---|---|---|---|
| Breadcrumb | — | `artist.name`, `title` | **yoxdur** |
| View tabs: foto / divarda gör / yaxınlaşdır / video | Plain image gallery + YoutubeEmbed | `images[]` `{type, sort_order, is_main, url(full)}`; `video {id, embed_url}` or `null` | **dəyişir** → `ArtworkViewer` |
| Thumb row: əsas / detal / çərçivə / divarda | Gallery lists all images | `images[].type` ∈ `main`, `detail`, `frame`, `wall` (`ArtworkImageType.php`) | **dəyişir**: label thumbs by `type`; the demo labels map 1:1. |
| "divarda gör" wall mode (2.70 m wall, 170 cm figure) | — | `width_cm`, `height_cm` | **yoxdur** (`DetailWallView`, §5.5). This is a *simulation*. The `wall` image type is a *photo*. They are different things and both can exist (§9 Q-D-4). |
| "yaxınlaşdır" 2× crop | — | `images[main].url` (full variant) | **yoxdur** (small). Whether the `full` variant has enough resolution for 2× is **unverified**. |
| ArtworkMeta lg: artist (link), *title*, medium · dims, price | h1/p tags | `artist.{id,name}`, `title`, `medium.name`, dims, `price`, `currency` | **dəyişir**. The artist link needs a **slug**, but the card or detail `artist` object has only `{id, name}` (§4.2 G-5). |
| Availability line; sold message ("Bu əsər satılıb…"); sold price "Satılıb, 2026" | — | `availability`. **No sold date/year field.** | **dəyişir**. Show "Satılıb" without a year. |
| Buttons "bu əsər haqqında soruş" (reveals the form) + "WhatsApp ilə yaz" | EnquiryForm always visible; WhatsApp link | `whatsapp_link` (null unless configured) | **dəyişir**. Hide WhatsApp when `null`. The enquiry is refused (422) for sold works unless `ALLOW_SOLD_ENQUIRIES` is set, so hide the form for sold works, as the demo does. |
| Enquiry form: ref line, name, email, phone (optional), message | `EnquiryForm` | `POST /enquiries` `{name, email, phone?, message, subject:'buy', artwork_code, website:''}` | **var** (restyle; logic and error handling already exist) |
| Description | `short_description` paragraph | `short_description` | **var** |
| SpecTable: mənşə / sertifikat / çərçivə / çatdırılma / janr | Only `provenance` is rendered | `provenance` (text), `certificate` (**boolean**), `frame_condition` (nullable text, **not localised**), `delivery_note` (nullable text, **not localised**), `genre.name`; also `year_created` | **dəyişir** (`SpecTable`). `certificate` is a yes/no, so its label ("var, müəllif imzası ilə") must come from the dictionary. `frame_condition` and `delivery_note` show AZ text even on EN pages (§9 Q-B-4). |
| Copy code button ("AN-… · kopyalandı") | — | `inventory_code` | **yoxdur** (small; `navigator.clipboard` needs a secure context: https or localhost) |
| "Oxşar əsərlər" (same genre, max 4, scaled cards) | ArtworkCard grid | `similar[]` (same `genre_id`, active, `sort_order`, `limit(4)`: `ArtworkController.php:77-87`) | **dəyişir** (uses `ScaledArtworkGrid` with share 0.3) |

### 3.5 Artist profile (`/artists/:slug`)

| Demo section | Existing component | Endpoint / field | Status |
|---|---|---|---|
| Tab row of all artist names | — | `GET /artists` (second request) | **yoxdur** (optional; §9 Q-D-5) |
| Head: h1 name, "born · city · discipline", 150×150 initials box | ArtistDetailPage | `first_name`, `last_name`, `birth_year`, `birth_place`, `direction`, `portrait_url` (nullable) | **dəyişir**. Use `portrait_url` when present and fall back to initials. |
| Two columns: bioqrafiya / yaradıcılıq yanaşması | ArtistDetailPage | `biography`, `artistic_approach` | **var** |
| sərgilər və mükafatlar (rows) | ArtistDetailPage lists | `exhibitions[] {year, title, venue}`, `awards[] {year, title}` | **dəyişir** (`ExhibitionRow`). Demo rows are clickable; API rows have no slug, so they cannot link. |
| bütün əsərləri (scaled cards) | ArtworkCard grid | `artworks[]`: cards **without** the `artist` key (`ArtistController.php:36-38`) | **dəyişir** (`ScaledArtworkGrid`, share 0.4). The card must tolerate a missing `artist`. |
| Artists index (accordion) | `ArtistsPage` grid | `GET /artists` | **dəyişir** (reuse `ArtistAccordion`) |

### 3.6 Checklist summary (items the brief asked to confirm)

| Item | Finding |
|---|---|
| Home wall → `/homepage.wall` | Confirmed. ArtworkCardResource list, **max 16** (since `b2bab8d`), `sort_order`. Not scaled today. |
| Catalogue filters → `/artworks` params | `artist`, `genre`, `medium`, `status`, `price_min`, `price_max`, `size_min`, `size_max`, `sort`, `page`, `per_page`. The frontend sends only artist, status, price and sort (`services/artworks.js` does not forward genre, medium, size or `per_page`). |
| Sort → `sort` | `newest`, `price_asc`, `price_desc`. The default is `sort_order`. |
| Artwork card → `ArtworkCardResource` | `inventory_code`, `title`, `artist {id, name}`, `image_url`, `genre {slug, name}`, `medium {slug, name}`, `price`, `currency`, `availability`, `width_cm`, `height_cm` (`ArtworkCardResource.php:21-48`) |
| Technical block | `provenance`, `certificate` (bool), `frame_condition`, `delivery_note` all exist. Only `provenance` is rendered today. |
| Similar works | Confirmed: same genre, max 4. |
| Image switching | `images[].type` ∈ main, detail, frame, wall. Not used today. |
| Enquiry form | `POST /enquiries` fields as above. Logic exists. |
| Navigation | `/navigation` is admin-managed and already API-driven. The demo's fixed list is only a sample. |
| Language switch | `LocaleSwitcher` exists. |
| Social links | `SocialLinks` + `BrandMark` exist. |
| Exhibition block | `/homepage.exhibition` exists (current, else upcoming, else null). Currently rendered as a plain card. |

---

## 4. Stage 3 — Gaps and conflicts

### 4.1 In the demo, provided by the backend, missing in the frontend (work to build)

Sizes: **S** is up to half a day, **M** is 1–2 days, **L** is 3 or more days. These are rough estimates.

| # | Item | Size |
|---|---|---|
| B-1 | Design tokens + self-hosted fonts in `public.css` (§6) | M |
| B-2 | Header redesign: overlay/solid modes, active item, **mobile menu**, text-style language strip | M |
| B-3 | Footer redesign (3 columns from settings and navigation) | S–M |
| B-4 | Sticky bottom contact bar (phone, WhatsApp, enquiry) | S |
| B-5 | `lib/wallScale.js`: pure scale and layout functions + `useElementSize` (ResizeObserver) hook | M |
| B-6 | `ScaledArtworkGrid` + ArtworkCard redesign (field sized from cm, meta block, badge, price formatting) | M |
| B-7 | Catalogue: genre and medium filters (once there is an options source, §4.2 G-2), price presets, chips, result count, URL-synced filters and page, empty-state reset | M–L |
| B-8 | Router fix: query strings, scroll-to-top, and `encodeURIComponent` in services | S |
| B-9 | `ArtworkViewer`: tabs, typed thumbnails, 2× zoom, video tab | M |
| B-10 | `DetailWallView` ("divarda gör") | M |
| B-11 | Detail right column: ArtworkMeta, availability/sold logic, reveal-on-click enquiry, WhatsApp, `SpecTable`, copy code, breadcrumb | M |
| B-12 | `HomeWall`: pinned horizontal wall on desktop, vertical on mobile, figure, counter, reduced-motion fallback | **L** |
| B-13 | `HomeHero` (section image + copy) and `StatsBand` | S–M |
| B-14 | `HomeExhibitionAct` (bordo band; optional body-colour transition) | S |
| B-15 | Featured "collection" layout for 0–6 items | M |
| B-16 | `ArtistAccordion` (home + `/artists`) | M |
| B-17 | Artist profile redesign (head, two columns, rows, scaled works) | S–M |
| B-18 | Dictionary: all new UI strings in **az and en** (roughly 80–120 new keys; estimate) | M |
| B-19 | `usePageMeta` / `<html lang>` update on locale change | S |

### 4.2 In the demo, not provided by the backend

**The size and theme/style filters are not in the demo.**
- The demo's catalogue has exactly five filters: `rəssam`, `janr`, `texnika`, `qiymət aralığı` and `status`. See `filterSelects` at template:2596–2602 and the grep in §1.1.
- The mock data has no size class, theme, subject, style or orientation field.
- So the size and theme/style filters are a **client request**, not a demo feature. The client's requirements list (catalogue filters: artist, category, price range, **size**, technique/material, **theme and style**, sale status) confirms it.
- **Size: resolved at `b2bab8d`.** `size_min`/`size_max` exist (see G-1a). **Theme/style:** still no parameter or column.

Both are evaluated below as requested, together with the other gaps found.

| # | Gap | (a) Backend change | (b) Partial frontend solution | (c) Defer to phase 2 | Recommendation |
|---|---|---|---|---|---|
| G-1a | **Size filter** — ✅ **resolved at `b2bab8d`** | Done: `size_min` / `size_max` (cm, on the larger side `max(width_cm, height_cm)`, inclusive, each optional; `ArtworkController.php:52-63`). | — | — | Build the UI. Any small/medium/large bands are frontend presets mapped to min/max, and the gallery must define the thresholds. |
| G-1b | **Theme / subject / style filter** | Large. There is no data at all: this needs a taxonomy table (or tags), a pivot table, admin UI, translations and seeding, then a filter. About 3–5 backend days plus content entry. | None: there is no data to filter on. | **Yes.** | **(c)**. `genre` already covers part of it (abstraksiya, fiqurativ). Do not promise this in phase 1. |
| G-2 | **Genre and medium option lists** — ✅ **resolved at `b2bab8d`** | Done: `GET /api/v1/genres` and `GET /api/v1/mediums` → `{slug, name, sort_order}`, active only, `name` localised with AZ fallback (nullable), not paginated. Genres and mediums cannot yet be edited in the admin. | — | — | Use the endpoints; no interim needed. |
| G-3 | **Artist works count** ("N əsər" in the accordion) | Small. Add `artworks_count` to ArtistResource (`withCount`). | N extra requests (`/artworks?artist=id&per_page=1`, read `meta.total`), which wastes the 60/min rate limit. | Drop the count. | **(a)**, or drop the count. |
| G-4 | **Representative artwork image per artist** (accordion background) | Medium (new relation or admin field). | Use `portrait_url` instead, or the first work from `/artists/{slug}` (N requests). | — | Use `portrait_url` with an initials fallback. This is a design decision (Q-D-5). |
| G-5 | **Artist slug on artwork objects.** The detail page links the artist name to the profile, but `artist` is only `{id, name}` (`ArtworkCardResource.php:24-31`). | Small. Add `slug` to the artist sub-object. | Look up the slug in `GET /artists` (one extra request, cached in context). | — | **(a)**. Interim: (b). |
| G-6 | **Sold date** ("Satılıb, 2026") | No field exists. Small–medium. | Show "Satılıb" only. | Yes. | **(b)**, no promise. |
| G-7 | **Footer artists column** (all artist names on every page) | — | One extra `GET /artists` in `SiteDataContext` on every page load. | Drop the column. | Owner decision. The request is cheap, but it adds to the per-IP rate budget. |
| G-8 | **Static marketing copy**: hero buttons, "how to buy" steps, pillars, CTA, stats notes (the collectors text is dropped: the page is unlisted since `23ce451`) | Content convention only: agree on `page.sections[].key` values for the `home` page (`hero`, `steps`, `cta` exist by seeder convention and are rendered by key). `sections` already has `{key, heading, body, image_url}`. | Hard-code the copy in the dictionary. This breaks the "everything editable in admin" principle (README intro). | — | **Agree section keys with the backend owner** (Q-C-1). Structured lists such as 4 steps may need one section per item. |
| G-9 | **Contact form: single "email or phone" field** (template:1637) | — | Keep the API's separate required `email` + optional `phone`. | — | Follow the API. Design adjusts. |
| G-10 | **Contact topics** (`əsər almaq` / `rəssam təklifi` / `digər`) | `/enquiry-subjects` returns the active public subjects and **excludes `other`** (API guide E16). | Use the API list. | — | Follow the API. There will be no "digər" option unless the backend changes. |
| G-11 | **Price range presets** (`<3000`, `3000–8000`, `>8000`) | None (min/max exist). | Map presets to `price_min`/`price_max`. Since `b2bab8d` either bound can be sent alone, so `<3000` is just `price_max=3000`. | — | (b). The gallery must set the thresholds and whether they are editable (Q-P-2). |
| G-12 | **Night "climate" theme and the editor props** (`scale`, `hangRhythm`, `humanScale`) | — | These are design-tool knobs, not site features. | — | Pick the defaults (scale 2, "əl ilə düzülmüş" rhythm, silhouette on, day theme) and do not build the switches. |

### 4.3 In the frontend, not in the four demo screens

**Correction to the brief:** the demo *does* contain simplified extra screens: `about`, `artists` index, `exhibitions`, `collectors` and `contact`. They are reachable from the footer (template:1937–1950). They are listed below as the design source where they exist.

| Existing page | Present in demo? | Design source / who decides |
|---|---|---|
| Exhibitions list (`/exhibitions`, tabs + pagination) | **Partially**: bordo "current" block, `ExhibitionRow` list of past shows, "yeniliklər" news list. No tabs, no pagination. | Reuse the demo patterns. The **designer or owner** decides the tabs and pagination styling. |
| Exhibition detail (`/exhibitions/:slug`) | No | **Designer** (or derive from the home exhibition act + scaled artwork grid). |
| Articles list and detail (`/articles`) | No. The "jurnal" nav item is dead in the demo. | **Designer**. Interim: typographic page built from the tokens (Spectral body, Archivo headings). |
| Contact (`/contact`) | **Yes** (address block, map placeholder, form) | Demo. The map placeholder has no API source; drop it or use a static link to `maps.google.com`. |
| Static pages (`/:slug`: about, custom) | **Yes** for about (rich layout); generic pages no. The demo's collectors screen is **not built**: the page is unlisted and `/collectors` answers 404 since `23ce451`. | The demo's rich layouts assume structured content, but the API gives `content` plus `sections[]`. **Owner and backend** agree on section keys (Q-C-1). The generic fallback uses the typographic template. |
| Not found | No | Developer, using the tokens. |
| Loading / error / empty states, pagination | No | Developer, using the tokens. Must stay accessible and keep their localised texts. |

---

## 5. Stage 4 — Wall ("real size") specification

This is the core idea of the site: **every artwork is shown at the same px-per-cm scale as its neighbours, so relative sizes are true.** Below, the demo's maths is written as a specification, cleaned of editor-only props.

**Symbols:**
- `p`: pixels per centimetre, the scale factor.
- `w`, `h`: an artwork's `width_cm` and `height_cm`.
- `W`, `H`: available container width and height in px.

### 5.1 Principles (confirmed from the demo)

1. **One `p` per view.** On the home wall, one `p` applies to every work (`layoutWall`, template:2451). In the catalogue, similar-works and artist-works grids, one `k` applies per rendered list (`cells`, template:2430–2449). **No scale is ever computed per card.** The home wall is a single row, so "per row" and "per wall" coincide there.
2. **Box from cm, image inside.** The artwork box is exactly `w·p × h·p`. The image is drawn inside with `object-fit: contain` on a Bone-toned field. The aspect ratio always comes from `w`/`h`, never from image pixels. In the demo's sample JPEGs the pixel ratios match the cm ratios, but real photos may include frame or margin (§9 R-3).
3. **Width is always listed first.** Dimensions are formatted `w × h sm` in AZ; use `cm` in EN.
4. **Recompute on container size change, never on a timer.** The demo recomputes on `window.resize` plus a `ResizeObserver` on the root, and *also* polls every 60 ms (`setInterval(tick, 60)`, template:2124). **The polling must not be ported.**

### 5.2 Home wall — desktop (container width > 760 px)

**Scale:**
```
H_avail = height of the wall viewport (pinned stage)          // demo: max(56vh, flex space)
p       = max(0.4, (H_avail − 160) / 170)                     // px per cm
canvasH = round(170·p + 160)                                  // px
```
- The 170 cm human figure, not the tallest work, fixes the scale.
- The 160 px is 48 px of air above the figure band, 48 px below, and 64 px for captions.
- The demo's editor multiplier (`fit·scale/2`) equals 1 at the default scale and is dropped.
- For a 1440×900 viewport, `p` works out to roughly 3 px/cm. This is **unverified**: it was calculated, not rendered.

**Horizontal layout (cm, multiplied by `p` at render):**
```
figure column   = 46 cm wide at x = 0, top = 48 px, height = 170·p
first work x    = 46 + 46 = 92 cm
gap (default)   = 43 cm, plus per-index jitter [0,9,−6,12,−8,5,−10,7] and pairing [0,−18,34,−20,30,−16,28,0] (cycled mod 8)
effective gap   = max(210 px / p, gap + jitter[i] + pairing[i])
vertical centre of every work = 48 + 85·p px   (the hang line is the middle of the 170 cm band)
work top        = 48 + 85·p − h·p/2
caption         = below the box, width max(190 px, w·p), 13 px
```
- **"Cut" rule.** At rest, the right edge of the viewport should fall about 30% into a work. If it falls outside 20–45% of that work, the gap is adjusted by `delta/i` for the works before it, clamped to [−0.5·gap, +1.5·gap].
- This is cosmetic. It is optional in phase 1; the spec keeps it so the demo's rhythm is reproducible.

**Scroll behaviour (demo):**
- The section is pinned with `height = innerHeight + overflow`.
- Vertical scroll maps to `translateX(−frac·overflow)`.
- A horizontal wheel or a drag becomes page scroll.
- A click is suppressed after a drag of more than 5 px.
- **Under `prefers-reduced-motion`:** no pin, plain `overflow-x: auto`.

**Resize:**
- A `ResizeObserver` on the wall container recomputes `p`, then the layout, then the pin height.
- Ignore changes of 2 px or less, as the demo does.

**Hang-line note:** the home wall centres works at 85 cm, the middle of the figure. The detail view (§5.5) centres works at **150 cm** from the floor, close to museum practice. The two views are therefore not physically consistent. This is a design decision, not a bug to silently fix (Q-D-1).

**Item count (updated at `b2bab8d`):**
- `wall[]` is now **capped server-side at 16** (`config('gallery.wall_limit')`, env `GALLERY_WALL_LIMIT`; not a query parameter).
- 16 works at about 3 px/cm with 43 cm gaps still gives a canvas of roughly 7,000 px. That is long but bounded, so no frontend `WALL_MAX` is needed.
- Render for *up to* 16 and tolerate fewer, down to 0. Ending with a "Bütün əsərlər →" tile is still a design option.

### 5.3 Home wall — mobile (container width ≤ 760 px, e.g. 375 px)

In the demo the wall turns **vertical**: no pin, no horizontal pan. Works stack top-to-bottom in a slight zig-zag, and the figure stands at the bottom of the column.

**Demo formulas:**
```
p       = 2 × 0.52 = 1.04 px/cm (fixed)
colInset = 46 + 18 = 64 cm (figure column + air)
work i:   top  = cur·p ;  left = (colInset + (i odd ? 22 : 0))·p
          cur starts at 8 cm and advances by h + 22/p (caption) + 43 (gap)
figure:   left 0, top = max(0, len·p − 170·p − 30)
canvasH = len·p + 40
```

**Defect for real data:**
- `p` is fixed, so a wide work overflows.
- Example: a 300 cm-wide work is 312 px wide, placed at an 89 px left offset, in a 335 px column.

**Specified fix:**
```
p_mobile = min(1.04, W / (colInset + 22 + w_max))
```
- `W` is the column width and `w_max` is the widest valid work on the wall.
- One `p` still applies to all works, so ratios are preserved.
- For the demo data (`w_max = 180`), 375 px gives `min(1.04, 335/266)`, which is 1.04. That is identical to the demo.

### 5.4 Scaled grids — catalogue, similar works, artist works

**Demo formulas** (`cells`, template:2430–2449):
```
contentW = W_container                                    // demo re-derives it from the root width
k        = (contentW · share) / max(w over the list)       // px per cm, one k per list
zoneH    = max(h over the list) · k                        // every card bottom-aligned in a zone this tall
card box width = max(w·k, 155 px) ; field = w·k × h·k
```

**`share` values:**

| Grid | Desktop | Narrow (≤ 760 px) |
|---|---|---|
| Catalogue | 0.44 | 0.86 |
| Similar works | 0.30 | 0.80 |
| Artist works | 0.40 | 0.86 |

**Consequences:**
- The scale depends on the widest work **in the current list**. It changes when filters or the page change; relative sizes within the list stay true. This is acceptable.
- The number of works in the list does not affect the scale.

**Additions for real data:**
- **Height cap.** One tall, narrow work (e.g. 30×200 cm) makes `zoneH` huge. Use:
  ```
  k = min(k_width, H_cap / max(h))
  H_cap ≈ 0.7 · viewport height
  ```
- **Outlier floor.** A tiny work is still at least 155 px wide as a *card*, but its field stays `w·k`. This is intended: small works look small.
- **Container, not root.** Measure the grid element with `ResizeObserver`. The demo's `contentW()` pad clamp (20–72 px) disagrees with its own CSS `--page-pad` (32–96 px); do not copy that.
- **Home "collection" act.** This act is **not** on a shared scale in the demo: it uses hand-set % widths with the true aspect ratio. Keep that as a separate, non-scaled layout (B-15).

### 5.5 Artwork detail — "Divarda gör"

**Demo formulas** (template:2617–2618, 3108–3110):
```
dp        = 1.6 px/cm desktop, 0.96 px/cm narrow (fixed)
wall box  = width 100%, height 270·dp  (2.70 m wall ⇒ 432 px / 259 px), sunken Bone, 1 px floor line
work      = left 30·dp, bottom (150 − h/2)·dp, size w·dp × h·dp   // centre 150 cm above the floor
figure    = 46 cm column, 170·dp tall, left (w + 60)·dp           // 60 cm to the right of the work
caption   = "Əsərin ölçüsü {w × h sm} · divar hündürlüyü 2,70 m"
```

**Demo defects:**
- The figure is given no `top`, so it defaults to `top: 48px` instead of standing on the floor. It floats about 112 px above the floor on desktop.
- `dp` does not depend on width, so a wide work plus the figure (`(30 + w + 60 + 46)·dp`) can be clipped by `overflow: hidden`.

**Specified behaviour:**
```
wallCm   = max(270, h + 40)                               // taller works raise the wall instead of clipping
needCm   = 30 + w + 60 + 46 + 30                          // left air + work + gap + figure + right air
dp       = min(1.6, W / needCm, H_max / wallCm)           // H_max ≈ 60vh desktop, 45vh mobile
work     : bottom = max(0, 150 − h/2)·dp                  // never below the floor
figure   : bottom = 0 (stands on the floor), left = (30 + w + 60)·dp
```
- The caption keeps "2,70 m" only when `wallCm = 270`; otherwise it shows the real value.
- On mobile the same formulas hold with the smaller `W`. The view does not need a vertical variant: it is a single work beside a figure.

### 5.6 Human figure (170 cm)

**Demo geometry** (template:2532–2546), all values in cm multiplied by `p`:
- **Wrapper:** 46 wide × 170 tall.
- **Body:** 32 × 148, left 7, rounded top (radius 16).
- **Head:** 18 cm circle, left 14, bottom at 150 cm.
- **Style:** colour `--ink-300` at 16% opacity.
- **Label** "170 sm" below it, at 11 px Archivo.
- **Alternative "ölçü xətti" mode:** a 1 px vertical rule. Not needed.
- **Accessibility:** the figure is decorative (`aria-hidden`). A visually-hidden sentence explains the scale ("Silhouette: 170 sm person for scale").

### 5.7 Missing, zero or invalid dimensions

**Backend guarantees:**
- `width_cm` and `height_cm` are `decimal(8,2) NOT NULL` (`…000018:17-18`).
- Admin validation requires `numeric|gt:0|max:999999.99` (`StoreArtworkRequest.php:39-40`).
- The resource always casts them to float (`ArtworkCardResource.php:46-47`).
- **Zero is still possible through seeders or direct SQL.** Absurd values (e.g. 99999) pass validation.

**The demo has no guards at all:**
- `NaN·p` becomes `"NaNpx"`, which gives a 0-size box.
- One bad value turns `Math.max(...)` into `NaN` for the whole list.
- `w = 0` makes `k` infinite.

**Specification:**
```
isValidDims(w, h) := Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 && w ≤ 2000 && h ≤ 2000
```
The 2000 cm sanity cap is a proposal (Q-P-4).

| Context | Behaviour when `!isValidDims` |
|---|---|
| Shared-scale computation (`max w`, `max h`) | **Exclude** the work, so one bad record cannot distort or break the whole list. If no valid works remain, fall back to a fixed layout (below). |
| Catalogue, similar or artist card | Render an **unscaled card**: width = the list's median card width (or 200 px); image in a 4:5 field with `object-fit: contain`; no dims text; a subtle "ölçü göstərilməyib" / "size not specified" line. |
| Home wall | **Skip** the work; do not place it on the wall. |
| Detail page | Hide the "divarda gör" tab and the dims line; the other tabs work as usual. |
| Dims text formatting | Format through one helper: numbers with no trailing `.00` (`80 × 60 sm`), locale-aware decimal separator for fractions. |

Report invalid records with `console.warn` in development only.

### 5.8 Responsibilities (proposed)

| Unit | Responsibility |
|---|---|
| `lib/wallScale.js` (pure, no React) | `isValidDims`, `formatDims(w, h, locale)`, `gridScale(list, {width, share, heightCap})` → `{k, zoneH}`, `homeWallLayout(list, {width, height, vertical})` → `{p, items[], len, canvasH}`, `detailWallLayout(w, h, {width, maxHeight})` → geometry. **All the maths lives here and is unit-tested.** |
| `lib/useElementSize.js` | `ResizeObserver` hook that returns `{width, height}` and ignores changes of 2 px or less. |
| `components/ScaledArtworkGrid.jsx` | Measures itself, calls `gridScale`, renders ArtworkCards with explicit field sizes (React `style` objects; see §6.4). |
| `components/ArtworkCard.jsx` | Presentational. Takes an optional `fieldSize {width, height}`; without it, falls back to the unscaled card. |
| `components/HumanFigure.jsx` | Draws the silhouette for a given `p`. |
| `components/HomeWall.jsx` | Measures, calls `homeWallLayout`, handles pin, scroll, drag, the counter and the reduced-motion fallback. |
| `components/DetailWallView.jsx` | Measures, calls `detailWallLayout`, renders the wall, work, figure and caption. |

---

## 6. Stage 5 — Design tokens, fonts and CSP

### 6.1 Tokens from the demo

Source: decoded template lines 450–533, the page CSS at lines 1048–1074, and the design-system bundle.

**Palette:**

| Token | Value | Use |
|---|---|---|
| `--ivory-100` | `#FAF8F3` | raised surface (inputs), `::selection` text |
| `--ivory-200` **Bone** | `#F4F0E8` | **page background**, text on dark |
| `--ivory-300` | `#EAE4D8` | sunken surface (detail wall), image placeholder |
| `--ivory-400` | `#DDD5C5` | — |
| `--ivory-500` | `#C9BFAC` | — |
| `--ink-900` | `#1A1614` | body text, strong lines, available status |
| `--ink-700` | `#3D3733` | — |
| `--ink-500` | `#6B625C` | muted text, reserved status |
| `--ink-300` | `#9A9089` | faint text, eyebrow labels, silhouette |
| `--bordo-900` | `#280706` | deep dark surface |
| `--bordo-800` **Bordo** | `#3E0B0A` | dark surface (footer, exhibition act), link hover |
| `--bordo-600` | `#5C1513` | — |
| `--red-500` **Signal** | `#F51000` | links, active nav/filter, focus ring, sold status, selection background |

**Semantic tokens:**
- **Lines:** `--line-hairline #DDD6CA`, `--line-on-dark #5F2D2B`, `--line-strong` = ink-900, `--line-accent` = Signal.
- **Text on dark:** `--text-on-dark` = Bone, `--text-on-dark-muted #B9A9A4`.
- **Scrims:** `rgba(26,22,20,.82 → .15)` bottom, `rgba(26,22,20,.45)` side.
- **Only shadow:** `0 2px 0 rgba(26,22,20,.06)` on wall items.

**Typography:**
- **Display face:** `"Archivo Narrow","Archivo",Helvetica,sans-serif`.
- **Text face:** `"Spectral",Georgia,serif`.

| Token | Value |
|---|---|
| `--size-display-1` | `clamp(44px,6.2vw,88px)` |
| `--size-display-2` | `clamp(34px,4vw,56px)` |
| `--size-display-3` | 28px |
| `--size-heading` | 21px |
| `--size-subheading` | 17px |
| `--size-body-lg` | 19px |
| `--size-body` | 16px |
| `--size-small` | 14px |
| `--size-caption` | 12.5px |

- **Sizes the page actually uses inline:**
  - Hero and exhibition title: `clamp(56px,9vw,148px)`, −0.035em, line-height 0.92.
  - Section h2: `clamp(34px,4.4vw,68px)`, −0.025em, line-height 1.02, weight 600.
  - Eyebrow labels: Archivo 11px, +0.01em, ink-300.
  - Body: Spectral 17px/1.62, max 62ch.
  - **Artwork titles are always Spectral italic.**
- **Leading:** display 0.98, heading 1.14, body 1.62, tight 1.3.
- **Tracking:** display −0.03em, heading −0.02em, label +0.01em.
- **Weights:** display 600, heading 500, body 400.
- **Case:** no `text-transform`. Headings are written lowercase-led ("keçmiş sərgilər").
- **Weights required:**
  - Archivo Narrow 400, 500, 600 and 700.
  - Spectral 300, 400, 500 and 600 roman; 300, 400 and 500 italic.

**Spacing, borders, layout:**
- **Spacing scale** `--space-1…10`: 4, 8, 12, 16, 24, 32, 48, 64, 96 and 144 px.
- **Layout:**
  - `--page-pad`: `clamp(32px,5vw,96px)`; 32 px at ≤ 1024; 20 px at ≤ 760.
  - `--nav-h`: 109 px (96 px at ≤ 760).
  - `--column-gap`: 32 px. `--row-gap`: 56 px. `--sec-top`: 72 px. `--sec-gap`: 120 px.
  - `--content-max: 1360px` is defined but unused, so the demo has no max-width container. Decide whether to keep it full-bleed (Q-D-6).
- **Borders:** always 1 px, either hairline or strong.
- **Radii:** 0, except inputs and chips at 2 px maximum. No shadows.
- **Motion:**
  - Durations: 90, 140 and 200 ms.
  - Easing: `cubic-bezier(.2,0,.2,1)`.
  - Keyframes: `aniRise` (26 px), `aniLift` (20 px), `aniZoom` (1.06 → 1).
  - All disabled under `prefers-reduced-motion`.
- **Breakpoints:** **760 px** (narrow) and **1024 px** (tablet). The demo measures its root element; with CSS these become media or container queries.

### 6.2 Moving the tokens into Tailwind v4

`public.css` has no `@theme` today. The plan for stage 1:

```css
@import 'tailwindcss';
/* fonts: see 6.3 */
@theme {
  --color-bone: #F4F0E8;   --color-ivory-100: #FAF8F3;  --color-ivory-300: #EAE4D8; …
  --color-ink: #1A1614;    --color-ink-500: #6B625C;    --color-ink-300: #9A9089;  …
  --color-bordo: #3E0B0A;  --color-bordo-900: #280706;  --color-signal: #F51000;
  --color-hairline: #DDD6CA;
  --font-display: "Archivo Narrow", "Archivo", Helvetica, sans-serif;
  --font-text: "Spectral", Georgia, serif;
  --breakpoint-narrow: 760px;  /* plus tablet 1024px; decide if Tailwind's sm/md/lg are replaced or extended */
  --radius-input: 2px;
  --ease-standard: cubic-bezier(.2,0,.2,1);
}
:root { /* semantic aliases the components use: --surface-page, --text-muted, --line-hairline, --page-pad, --nav-h … */ }
```

- `@theme` variables generate utilities (`bg-bone`, `text-signal`, `font-display`, …).
- Semantic and layout variables stay as plain `:root` custom properties.
- Keyframes and `prefers-reduced-motion` rules go in `public.css`.
- `public.blade.php` `<body class="bg-white text-neutral-900">` becomes `bg-bone text-ink` in stage 1. This is the only Blade change needed.

### 6.3 Fonts (CSP `font-src 'self'`)

> **Updated after stage 1 (`6158261`, 2026-09-26). Archivo Narrow is out.** The public site uses two families:
>
> | Family | Package | Loaded | Role |
> |---|---|---|---|
> | **Montserrat** (variable, roman only) | `@fontsource-variable/montserrat` 5.3.0 | latin + latin-ext, weights used 400/500/600 | Interface — what the machine writes: nav, buttons, filters, status, price, medium · dimensions, inventory code, forms, footer, section headings, the artist's big name, the exhibition act title, wall scale labels |
> | **Spectral** | `@fontsource/spectral` 5.3.0 | latin + latin-ext, **400 roman + 400 italic only** | What a person writes: the artwork title (always italic), biography, artistic approach, short description, exhibition and article text, the home intro sentence |
>
> Rule: a sentence written to be read is Spectral, everything else Montserrat; when in doubt, Montserrat. Components bind to `font-ui` / `font-editorial`, never to a font name.
>
> - **How they load:** hand-written `@font-face` rules in `resources/css/public.css` pointing at the fontsource woff2 files (Montserrat's package CSS would also pull cyrillic and vietnamese). Vite emits them to `/build/assets/`, `font-display: swap`, no `@fonts`, no CDN. 6 files, **189 KiB** in total; a page that uses no Spectral yet loads only the two Montserrat files (109 KB). Zero CSP violations, no 404, no off-origin font on the built site.
> - **Azerbaijani letters** (ə Ə ö Ö ü Ü ğ Ğ ı I İ i ş Ş ç Ç) render from their own face in Montserrat 400/500/600 and Spectral 400 roman and italic — checked programmatically and visually.
> - **Fallbacks are metric-matched** (`Montserrat Fallback` = Arial at 108.46%, `Spectral Fallback` = Georgia at 97.94% / Georgia Italic at 88.11%, with ascent/descent overrides), so the swap does not visibly jump.
> - **Density — affects stages 2 and 3.** At the same size Montserrat is **31–39% wider** than the demo's Archivo Narrow. Stage 1 dropped the small levels one step (1px) and tightened tracking (e.g. meta 14→13px −0.01em, nav 15→14px, label 13→12px, badge 12→11px; display and hero slightly smaller and tighter). **Even after that, Montserrat text is still about 20% wider than in the demo** (measured 1.17–1.29× per level). The demo's layouts were drawn for the narrow face, so these will not fit at the demo's widths without layout changes:
>   - **Header:** the nav items plus logo, social links and language switch (plan for wrapping/collapse earlier than the demo's breakpoint; R-9);
>   - **Catalogue filter row:** five selects plus sort in one line;
>   - **Footer columns:** narrower columns wrap sooner.
>   Measure these at 1024/1280/1440 px in stages 2 and 3 instead of copying the demo's widths.
>
> The analysis below is the pre-stage-1 research and is kept for history; where it mentions Archivo Narrow, read Montserrat.

**Facts (before stage 1):**
- **No web font is loaded on the public site today.**
  - `public.css` has no `@font-face`.
  - `public.blade.php` has no `@fonts` and no `<link>`.
  - The site renders in the system stack.
- **The Vite font plugin is configured:** `laravel-vite-plugin/fonts` `bunny('Instrument Sans', {weights:[400,500,600]})` (`vite.config.js:19-23`).
  - It **self-hosts at build time**: the current `public/build/assets/` contains six `instrument-sans-*.woff/woff2` files and `fonts-manifest.json`.
  - It is used only by `welcome.blade.php` through `@fonts`. Admin CSS names the font but never loads it.
  - The `@fonts` Blade directive emits an **inline `<style>`** with `@font-face` rules. It relies on a Vite nonce to pass CSP.
  - **No nonce is configured anywhere, and `style-src 'self'` has no `'unsafe-inline'`.** In `enforce` mode that inline block would be blocked. This conclusion comes from reading the code and was **not verified in a browser**.
  - The plugin's default `latin` subset (U+0000–00FF + U+0131) **does not include ə (U+0259), ş (U+015F), ğ (U+011F) or İ (U+0130)**, which Azerbaijani needs.
- **The demo embeds Google-Fonts subsets as woff2:** 41 files, of which 38 are distinct font subsets. There is no external font host.
  - Archivo Narrow comes as a variable font (one file serves 400–700).
  - Spectral comes as static weights.
  - Both are split into latin, latin-ext, vietnamese and cyrillic.
  - The **latin-ext** range (U+0100–02BA …) covers ə, ş and ğ.
- **Licences:**
  - `@fontsource/spectral` 5.3.0, `@fontsource/archivo-narrow` 5.3.0 and `@fontsource-variable/archivo-narrow` 5.3.0 are all **OFL-1.1**, checked with `npm view` on 2026-09-25.
  - Both families are open-source under the SIL Open Font License, which permits self-hosting and bundling.
  - Keep the licence files with the fonts.

**Recommendation for stage 1 (superseded — done with Montserrat instead of Archivo Narrow, see the box above):**
- Add `@fontsource/spectral` and `@fontsource-variable/archivo-narrow` as dependencies.
- Import only the needed weights and styles, and only the **latin + latin-ext** subsets, from `public.css` (or `main.jsx`). Use `font-display: swap`.
- Vite bundles the woff2 files into `/build/assets/`, which is **same-origin and satisfies `font-src 'self'`**. The CSS stays external, which satisfies `style-src 'self'`.
- Do **not** use `@fonts`, Google Fonts or Bunny at runtime.
- Leave the existing `bunny('Instrument Sans')` entry alone; it belongs to the welcome and admin surface.
- Optionally install `fontaine` later to silence the build warning; it is not needed.
- **Alternative:** copy the demo's woff2 files into `resources/fonts/` with an `@font-face` file. This works, but the subsets are anonymous blobs; fontsource is more maintainable.
- Add `<link rel="preload">` for the two most-used files later, only if measurements justify it. It must be an external `<link>`, not inline CSS.

### 6.4 Other CSP constraints

**Policy** (`SecurityHeaders.php:63-91`):
```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: <media origin>; font-src 'self';
connect-src 'self'; frame-src https://www.youtube-nocookie.com; base-uri 'self'; form-action 'self'; object-src 'none'
```
- `frame-ancestors 'self'` is added in enforce mode.
- The default mode is **report-only** (`config/security.php:43`), and `.env.production.example` uses `enforce`.
- The header is **omitted while `public/hot` exists**, i.e. during Vite dev, so CSP problems only show on a built bundle. Test every stage against a production build with CSP in enforce mode.

| Demo construct | Present? | Migration |
|---|---|---|
| `<style>` blocks | Yes: 3 blocks in `<helmet>`, two of them identical duplicates (tokens, fonts, base), plus page CSS | Move to `public.css` (tokens, keyframes, base, media queries). Inline `<style>` is blocked by `style-src 'self'`. |
| `style="…"` attributes | **370** in the template, plus every design-system component styling itself with inline style objects | Static styles become Tailwind classes or `public.css` classes. **Dynamic geometry** (wall positions, cm × p sizes, transforms) becomes React `style={{…}}` objects. React DOM applies them through the CSSOM (`element.style`), which CSP does not block. Only markup-parsed `style=""` attributes and `setAttribute('style', …)` are blocked. The existing honeypot already relies on this (`EnquiryForm.jsx:69`). **Verify once in a browser with CSP in enforce mode in stage 1**; this is unverified in this environment. Prefer CSS custom properties passed through `style` (e.g. `style={{'--w': px}}`) so the rules themselves stay in the stylesheet. Never use `dangerouslySetInnerHTML` with markup containing `style=`. |
| Inline `<script>` | Yes: the bundler loader and the page logic (`text/x-dc`) | Not ported. All logic is reimplemented in the Vite-bundled React app. The only inline script in the shell stays the JSON-LD data block, which is allowed. |
| Inline event handlers (`onclick=`) | None (0) | — |
| External scripts | React/ReactDOM 18.3.1 referenced from `unpkg.com` (bundled in the file); Babel standalone referenced by the runtime but not used | Not needed: React 19 is already an npm dependency. |
| External fonts | None (fonts are embedded) | See §6.3. |
| External images | None. All images are embedded (8 artwork JPEGs, 1 hero PNG, 2 logo PNGs). | Real images come from the API media origin, which `img-src` allows. **Do not ship the demo's images:** the hero comes from the CMS section `image_url`, the logos from site settings, the artworks from the API. |
| External links (`wa.me`, `instagram.com`, `facebook.com`, `maps.google.com`, `tel:`, `mailto:`) | Yes | Plain `<a href>` navigation is not governed by CSP. Use data from settings and social links, never the demo's placeholder numbers. |
| `navigator.clipboard` | Yes (copy code) | Needs a secure context (https or localhost); feature-detect it and fall back silently. |

---

## 7. Stage 6 — Impact on tests

**Current public suite:** 34 files, 198 tests at `3b3e806`. The admin suite (28 files, 117 tests) is untouched by this work.

### 7.1 Logic tests — keep; expected to survive with no or trivial change

| File | Tests | Why it survives |
|---|---|---|
| `api.test.jsx` | 6 | Query building, errors, 429 |
| `services.test.jsx` | 15 | Exact endpoint URLs. **Will change** if services gain `encodeURIComponent` or new params such as genre, medium and `per_page`, but the change is mechanical. |
| `enquiries-service.test.jsx` | 5 | POST, 422, 429 |
| `useApiData.test.jsx` | 5 | Hook states |
| `usePageMeta.test.jsx` | 6 | Head tags (extend it if `<html lang>` or og updates are added) |
| `useRouter.test.jsx` | 11 | Matching and navigation. **Extend** for query strings and scroll-to-top. |
| `LocaleContext.test.jsx` | 4 | Storage and default |
| `dictionary.test.jsx` | 3 | `t()` fallback. Consider adding an "az and en key sets are identical" assertion. |
| `SocialLinks.test.jsx` | 24 | URL safety and display modes, queried by role |
| `BrandMark.test.jsx` | 6 | Display-mode semantics |
| `YoutubeEmbed.test.jsx` | 4 | iframe src and null cases |

### 7.2 Markup and text tests — will break and need rewriting alongside their component

| File | Tests | What breaks |
|---|---|---|
| `ArtworkCard.test.jsx` | 6 | Exact `"3200 AZN"` (→ formatted `3 200 AZN`), `"X by Y"` alt (→ `"title, artist"` as in the demo, localised), status text |
| `domain-cards.test.jsx` | 6 | Raw ISO date string, card structure |
| `ImageWithFallback.test.jsx` | 4 | Exact `class` attribute equals the passed className |
| `Pagination.test.jsx` | 4 | Button labels |
| `state-primitives.test.jsx` | 8 | Exact loading, empty and error strings |
| `LocaleSwitcher.test.jsx` | 1 | Button structure (the "EN" button is also clicked by many page tests; keep it a `button` named `EN`) |
| `SiteShell.test.jsx` | 4 | Nav link names, "exactly 2 logos and 2 social link sets" (header + footer). Breaks if the mobile menu duplicates nav or social links. |
| `SiteDataContext.test.jsx` | 10 | Mostly request counting (logic). Some assertions rely on the footer showing the email and on exactly two brand and social instances. |
| `App.test.jsx` | 5 | Request counts (logic) + link text. The static-page case now uses `/about`; a new case asserts `/collectors` → not-found. |
| `routing-completeness.test.jsx` | 1 | **Brittle:** regex-reads `App.jsx` source for `const PAGES = {…};`. Rewrite it to import the route table instead. |
| `EnquiryForm.test.jsx` | 6 | Label texts; honeypot located by `closest('div')` with an inline `position:absolute` style |
| `ContactPage.test.jsx` | 3 | "Mövzu" label wrapping a `<select>` |
| `CataloguePage.test.jsx` | 5 | `getByLabelText('Status')`, retry text. Filter UI changes (preset price select, chips, URL sync). |
| `ExhibitionsPage.test.jsx` | 3 | Tabs are buttons named "Arxiv" |
| `HomePage.test.jsx` | 9 | "Yüklənir...", plus since `2c64176` a *sections by key* block: hero not first, steps/cta rendered and unknown keys ignored, hero missing, empty/absent sections. **Keep those four behaviours** when HomeHero replaces the markup. |
| `ArtworkDetailPage.test.jsx` | 10 | Gallery img alt/src, eager first image, WhatsApp link, iframe title. Viewer tabs replace the gallery. |
| `ArtistDetailPage.test.jsx` | 4 | Content text (mostly survives) |
| `ArtistsPage.test.jsx` | 3 | Grid, which becomes the accordion |
| `ExhibitionDetailPage.test.jsx` | 5 | Mostly content; restyle only |
| `ArticlesPage.test.jsx`, `ArticleDetailPage.test.jsx` | 2 + 4 | Mostly content; restyle only |
| `StaticPage.test.jsx` | 5 | Mostly content |
| `NotFoundPage.test.jsx` | 1 | Title and robots (survives) |

**Rule:** each stage updates the tests of the components it touches in the same stage, so the suite is green at every stage boundary. Do not batch test repairs at the end.

### 7.3 New tests to write

| New test file | Covers |
|---|---|
| `wallScale.test.js` (**priority**) | • `isValidDims`: 0, negative, NaN, `undefined`, string, >2000, valid.<br>• `formatDims`: integers, decimals, az "sm" vs en "cm".<br>• `gridScale`:<br>  – widest work gets exactly `share·width`<br>  – ratios preserved (`w1/w2 = px1/px2`)<br>  – invalid entries excluded<br>  – all invalid entries → fallback<br>  – height cap<br>  – 155 px minimum card width<br>• `homeWallLayout` (desktop):<br>  – `p = max(0.4,(H−160)/170)`<br>  – every centre at `48+85p`<br>  – min gap ≥ 210 px<br>  – `canvasH`<br>  – one `p` for all items<br>  – invalid items skipped<br>• `homeWallLayout` (mobile):<br>  – vertical stacking<br>  – `p = min(1.04, W/(64+22+w_max))`<br>  – widest item fits in 375 px<br>• `detailWallLayout`:<br>  – `dp` capped by width and height<br>  – 270 cm floor case<br>  – tall work raises the wall<br>  – figure stands on the floor<br>  – `bottom` never < 0 |
| `useElementSize.test.jsx` | ResizeObserver stub; ignores changes of 2 px or less; cleanup |
| `ScaledArtworkGrid.test.jsx` | Renders field sizes from the stubbed width; re-renders on resize; unscaled fallback card |
| `HomeWall.test.jsx` | Renders N items (0–16) and the figure; reduced-motion path (no pin); invalid dims skipped |
| `DetailWallView.test.jsx` | Hidden tab for invalid dims; caption text |
| `ArtworkViewer.test.jsx` | Thumb labels from `images[].type`; tab switching; video tab only when `video` is set |
| `SpecTable.test.jsx` | `certificate` boolean → localised yes/no; null `frame_condition` and `delivery_note` rows hidden |
| `priceFormat.test.js` | `6 400 AZN`; `null` → "price on request"; locale variants |
| `catalogueFilters.test.js` | Preset → `price_min`/`price_max` and size band → `size_min`/`size_max` mapping (open-ended presets send one bound); URL ↔ state round-trip; page reset on filter change |
| `Header.test.jsx` | Active item per page key; mobile menu open/close and focus trap; variable item count |
| `StickyContactBar.test.jsx` | Hides WhatsApp and phone when settings are empty |

---

## 8. Stage 7 — Work plan

**Proposed order:**
- I agree with the brief's order, with **three changes**:
  1. Add **stage 0** (environment and backend questions).
  2. Pull the **wall maths module forward** into stage 3, so that the catalogue, detail and home all consume one tested module.
  3. Make **mobile a requirement of every stage**, with stage 8 as a final cross-device QA pass.
- **Why:**
  - The home wall's mobile mode and the scaled grids are *core*, not polish. Retrofitting 375 px at the end would reopen every component.
  - "Test restoration" as a last stage conflicts with the rule that `npm test` passes after every stage, so tests move into each stage and stage 9 becomes a coverage audit.

**Rules for every stage:**
- Exit criteria: `npm test` green, `npm run build` green, checked at 375 px and ≥ 1280 px, AZ and EN strings present, no new CSP violations with CSP enforced on a production build.
- Durations are rough developer-day estimates for one frontend developer, and are **unverified**.

| # | Stage | What is done | Files touched (main) | Est. | Depends on |
|---|---|---|---|---|---|
| **0** | Preconditions | • Install Node LTS on the host.<br>• `chown` `public/build`.<br>• ~~Enable Docker WSL integration and run the pending migration~~ (done, §0).<br>• ~~Decide on Laravel Boost~~ (closed: do not install).<br>• ~~Delete the `:Zone.Identifier` file~~ (done).<br>• Remaining backend questions: G-3, G-5, Q-C-1, Q-B-3, and S1–S6 (§9.3). G-2, D-1 and the wall limit are resolved.<br>• Get a browser check of CSP in enforce mode on the current build. | none (environment) | 0.5 | owner |
| **1** | Tokens and fonts | • `@theme` + semantic vars + keyframes + reduced-motion in `public.css`.<br>• fontsource Spectral + ~~Archivo Narrow~~ Montserrat (latin, latin-ext) — **done in `6158261`**, see §6.3.<br>• Blade body classes.<br>• Vitest `exclude` for `.claude/**`.<br>• Verify that React `style` objects pass CSP. | `resources/css/public.css`, `package.json`/`package-lock.json`, `resources/views/public.blade.php` (body class only), `vite.config.js` (test exclude) | 1–1.5 | 0 |
| **2** | Layout | • Header (overlay/solid, active item, mobile menu, language strip).<br>• Footer.<br>• StickyContactBar.<br>• Router fix (query strings, scroll-to-top) + `encodeURIComponent`.<br>• `<html lang>` sync.<br>• Dictionary keys. | `layout/*`, `components/LocaleSwitcher.jsx`, `components/SocialLinks.jsx` (classes), `lib/useRouter.js`, `services/*`, `i18n/dictionary.js`, tests: SiteShell, SiteDataContext, App, LocaleSwitcher, useRouter, services | 3–4 | 1 |
| **3** | Wall maths + card + catalogue | • `lib/wallScale.js` + `useElementSize` with full unit tests.<br>• `ScaledArtworkGrid`.<br>• ArtworkCard redesign.<br>• Price and dims formatting.<br>• Catalogue: all 5 demo filters (genre and medium options from `GET /genres` / `GET /mediums`), plus the size filter (`size_min`/`size_max`), price presets, chips, count, sort, URL sync, pagination, empty reset. | `lib/wallScale.js`, `lib/useElementSize.js`, `components/ArtworkCard.jsx`, `components/ScaledArtworkGrid.jsx`, `components/FilterBar.jsx`, `components/FilterChip.jsx`, `pages/CataloguePage.jsx`, `services/artworks.js` (+ new `services/lookups.js`), tests | 4–5 | 2; size-band and price-preset thresholds (Q-P-1, Q-P-2) |
| **4** | Artwork detail | • Breadcrumb.<br>• `ArtworkViewer` (tabs, typed thumbnails, 2× zoom, video).<br>• `DetailWallView` + `HumanFigure`.<br>• ArtworkMeta, availability and sold logic, reveal-on-click EnquiryForm, WhatsApp, SpecTable, copy code.<br>• Similar works via `ScaledArtworkGrid`. | `pages/ArtworkDetailPage.jsx`, new `components/ArtworkViewer.jsx`, `DetailWallView.jsx`, `HumanFigure.jsx`, `SpecTable.jsx`, `Breadcrumb.jsx`, `EnquiryForm.jsx` (style), tests | 4–5 | 3; G-5 (artist slug) or interim lookup |
| **5** | Home | • HomeHero.<br>• StatsBand.<br>• **HomeWall** (pin, drag, counter, mobile vertical, reduced motion).<br>• Exhibition act.<br>• Collection layout (0–6).<br>• ArtistAccordion.<br>• Steps, pillars and CTA from agreed CMS sections. | `pages/HomePage.jsx`, new `components/HomeWall.jsx`, `HomeHero.jsx`, `StatsBand.jsx`, `ArtistAccordion.jsx`, `CollectionGrid.jsx`, `StepList.jsx`, tests | 5–7 | 3, 4 (HumanFigure); Q-C-1 (keys beyond `hero`/`steps`/`cta`) |
| **6** | Artists | • `/artists` accordion.<br>• Profile: head with portrait/initials, two text columns, exhibition and award rows, scaled works. | `pages/ArtistsPage.jsx`, `pages/ArtistDetailPage.jsx`, `components/ArtistCard.jsx`, `components/ExhibitionRow.jsx`, tests | 2–3 | 3, 5 (accordion) |
| **7** | Other pages | Exhibitions list and detail, articles list and detail, contact, static pages (about layout by section key; no collectors page), not-found, loading/error/empty states, pagination style. | remaining `pages/*`, `components/ExhibitionCard.jsx`, `ArticleCard.jsx`, `Pagination.jsx`, state components, tests | 3–4 | 1, 2; designer input for pages outside the demo (§4.3) |
| **8** | Cross-device QA | • 375, 768, 1024, 1280 and 1440 px.<br>• Keyboard and focus.<br>• Reduced motion.<br>• Long AZ/EN strings.<br>• Many or zero nav items.<br>• Real images with odd aspect ratios.<br>• CSP enforce run.<br>• Lighthouse pass on home and catalogue. | fixes anywhere in `resources/js/public/`, `public.css` | 2–3 | 1–7 |
| **9** | Test coverage audit | Fill gaps from §7.3; remove dead dictionary keys; make sure no test depends on a demo placeholder. | `__tests__/*` | 1 | 1–8 |

**Total:** roughly **26–35 developer-days**. This is a rough estimate and is unverified. G-2, D-1 and the size filter G-1a were delivered at `b2bab8d`. The remaining backend items (G-3, G-5, plus whatever S1–S6 in §9.3 require) are smaller and not estimated here.

---

## 9. Stage 8 — Risks and open questions

### 9.1 Risks

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| R-1 | **The home wall is the hardest component.** It combines scroll-pinned horizontal panning, drag, a resize-driven layout, and a separate mobile mode. The demo implementation relies on a 60 ms polling timer and dead code. | Schedule overrun; jank on low-end phones | Pure, tested maths module first (stage 3). Build HomeWall last among the core screens. Reduced-motion and no-pin fallback from day one. |
| R-2 | **Build is broken locally** (root-owned `public/build`) and **Node is missing** on the host. | Blocks the per-stage exit criteria | Stage 0 |
| R-3 | **Real photos will not match the cm aspect ratio** (frames, margins, crops). The demo's sample JPEGs match exactly; its artwork images are real photos, not flat colour fields, with flat `tone` backgrounds used only as placeholders. | Letterboxing inside boxes | The box is always cm-driven and the image uses `object-fit: contain` on a Bone field. Ask the gallery to upload the `main` image cropped to the canvas edge. `artworks.aspect_ratio` and `media.original_width/height` exist in the DB but are not exposed. |
| R-4 | ~~Unbounded `wall[]`~~ **Resolved at `b2bab8d`:** capped at 16 server-side | — | Render 0–16 items |
| R-5 | **CSP in enforce mode only bites on production builds** (the header is disabled while `public/hot` exists) | Late discovery of blocked styles or fonts | Enforce-mode check at the end of every stage |
| R-6 | **Azerbaijani glyphs** (ə, ş, ğ, İ) missing if the wrong subset is chosen | Broken typography | latin-ext subsets (§6.3); a visual check of "Əsər divarda başlayır. Şəki. Gəncə. İpək" |
| R-7 | **Text-heavy tests** (about 25 of the 34 public files assert on copy or markup) | Every redesign PR touches tests | Rewrite per stage; query by role and label; derive text from the dictionary in tests where possible |
| R-8 | ~~`price_max` alone returns 422~~ **Resolved at `b2bab8d`:** `gte:price_min` applies only when `price_min` is filled (`PublicArtworkIndexRequest.php:25`) | — | None needed |
| R-9 | **Variable navigation** (admin-managed count and labels). A long AZ label or 8+ items break a one-line header. | Header overflow | Horizontal scroll (as in the demo) or a collapse into the menu at a measured width; test with 0 and 10 items |
| R-10 | **Homepage `exhibition` may be a news or announcement item** (no `type` filter, `HomepageController.php:81-84`) | Wrong content in the exhibition act | Frontend: render it only when `type === 'exhibition'`, or ask the backend to filter (Q-B-3) |

### 9.2 Open questions

**Client and product**

| ID | Question |
|---|---|
| Q-P-1 | **Size and theme/style filters.** Both are in the client's requirements, not in the demo. **Size is available in the API since `b2bab8d`.** Open: whether the UI uses free cm inputs or bands, and the band thresholds. Theme/style is still deferred (G-1b). |
| Q-P-2 | Price presets: which thresholds (the demo uses 3000 and 8000 AZN), and are they fixed or admin-editable? |
| Q-P-3 | "ən yeni" sort: the API's `newest` is *date added* (`created_at`); the demo sorts by *year created*. Which does the client mean? |
| Q-P-4 | Sanity limit for dimensions (proposed 2000 cm), and whether invalid-dimension works should appear in the catalogue at all. |
| Q-P-5 | Should "sold" show a year? There is no field for it. |

**Design**

| ID | Question |
|---|---|
| Q-D-1 | Hang line: the home wall centres works at 85 cm (the middle of the figure) and the detail view at 150 cm. Keep both, or unify? |
| Q-D-2 | Pages outside the demo: exhibition detail, articles, generic static page, not-found. Who designs them? Otherwise the developer applies the tokens. |
| Q-D-3 | The header over the hero needs an ivory logo, but settings hold one `logo_url`. Options: a second asset, a CSS filter, or no overlay. |
| Q-D-4 | "divarda gör" (simulated) vs. the `wall`-type photo: show both (the photo as a thumbnail, the simulation as a tab)? |
| Q-D-5 | Artist accordion: portrait (from the API) instead of an artwork image (not available)? Artist tab row on the profile: keep it? |
| Q-D-6 | Max content width: the demo is full-bleed (`--content-max` is unused). Keep that on 2560 px screens? |
| Q-D-7 | Home act 3 changes the **body** background while visible, and the header changes on scroll. Keep these scroll-linked effects? They carry motion and accessibility cost. |
| Q-D-8 | **Error and success colours are missing from the palette.** After stage 1 the components still use Tailwind's `text-red-700` (form field errors, error banners) and `text-green-700` (the enquiry success message). The stage-1 tokens have no error or success colour, and Signal is reserved (and counted toward the three-per-screen limit), so it should not double as the error colour by default. **Decision deferred to stage 4** (artwork detail, where the enquiry form is restyled): add error/success tokens with ≥ 4.5:1 on Bone, or express the states without a new hue. Until then leave the two classes as they are. |

**Content and CMS**

| ID | Question |
|---|---|
| Q-C-1 | **Section-key convention** for the home page and the about page, so that all demo copy is admin-editable. **Partly settled at `2c64176`:** `hero`, `steps` and `cta` are seeded and rendered by key. They remain free admin strings, not a backend enum: an admin can rename or deactivate them, so the frontend must tolerate a missing key. Still open: keys for pillars, wall intro and "first time buying", and the about page. The collectors page is out (unlisted). Needs the backend owner and whoever enters content. |
| Q-C-2 | The demo is **Azerbaijani only**. EN copy is needed for about 80–120 new UI keys and for all CMS content. Who writes the EN copy, and is EN launch-blocking? Units: "sm" in AZ, "cm" in EN. |
| Q-C-3 | Contact data in the demo (phone, email, address, hours) is placeholder; the real values come from site settings. Confirm they are filled in. |

**Backend (requires coordination; the frontend must not change backend code: API guide §A.4)**

| ID | Question |
|---|---|
| Q-B-1 | ~~`GET /genres`, `GET /mediums` (G-2)~~ done at `b2bab8d`. Still open: `artworks_count` on artists (G-3) and `slug` on the artwork `artist` object (G-5, = S3 in §9.3). |
| Q-B-2 | ~~A limit for `wall[]`~~ done (16). Still open: an order guarantee (there is no `id` tie-break on wall, featured, similar or artist works: §10 D-6). |
| Q-B-3 | Should `/homepage.exhibition` exclude news and announcement types? |
| Q-B-4 | `frame_condition` and `delivery_note` are **not localised**, so EN pages show AZ text. Acceptable? |
| Q-B-5 | ~~`price_max` without `price_min` 422 (D-1)~~ fixed at `b2bab8d`. Still open: the empty-string param behaviour (D-2). |

**Environment**

| ID | Question |
|---|---|
| Q-ENV-1 | ~~Install Laravel Boost?~~ **Closed: no.** The API guide §B states Boost is not a project dependency and must not be installed, and `composer.json`/`composer.lock` contain no `boost` entry. The block in `CLAUDE.md`/`AGENTS.md` is boilerplate from the initial commit. |
| Q-ENV-3 | ~~Docker Desktop WSL integration off; migration pending~~ **Closed 2026-09-26:** the integration is enabled and the migration is applied (§0). |
| Q-ENV-2 | `npm run dev` + HMR: neither Blade shell contains `@viteReactRefresh`, which `@vitejs/plugin-react` normally needs for HMR. This is **unverified**. If it breaks, the one-line Blade fix touches `public.blade.php`. |

### 9.3 Six open questions S1–S6 — status at `3b3e806`

Checked against the code (S1–S6 need no data; the live stack was up for the §0 checks). None of the six was touched by `b2bab8d`, `2c64176` or `23ce451`.

| ID | Question | Status | Evidence |
|---|---|---|---|
| S1 | Google Analytics allowed by the security policy? | **Still open** | `SecurityHeaders::policy()` (`SecurityHeaders.php:65-76`) still has `script-src 'self'`, `connect-src 'self'` and `img-src 'self' data: <media origin>`. No `googletagmanager.com` or `google-analytics.com` source exists, and guide §24/§26 say there is no analytics or consent tooling. Adding GA is a backend CSP change, plus a cookie/consent decision. |
| S2 | Google Maps embed allowed? | **Still open** | `frame-src https://www.youtube-nocookie.com` only (`SecurityHeaders.php:72`). A Maps iframe would be blocked in enforce mode. A plain `<a href>` to `maps.google.com` works without a policy change. |
| S3 | Artist `slug` on the artwork object? | **Still open** | `ArtworkCardResource.php:24-31` returns `artist: {id, name}` only; `ArtworkDetailResource` reuses the card. Exhibition `artists[]` has `slug`, artworks do not. **Interim:** fetch `GET /artists` (every item has a non-null `slug` since `b2bab8d`), map `artist.id` → `slug`, and render plain text when there is no match (the artist is inactive or has no AZ slug). This costs one extra request per detail page. Permanent fix: add `slug` to the card's `artist` object (G-5). |
| S4 | YouTube video field on articles? | **Still open** | `ArticleResource.php:20-34` has no `video`; guide §12 lists video on artworks and exhibitions only. `media[].type` can be `video`, but that is an uploaded media item with a `detail` image URL, not a YouTube id. |
| S5 | Homepage returns only one exhibition? | **Still open** | `HomepageController.php:82-85`: one `->first()` current, else one `->first()` upcoming, returned as a single `exhibition` object or `null`. For current *and* upcoming blocks, call `GET /exhibitions?filter=current` and `?filter=upcoming`. There is still no `type` filter (R-10). |
| S6 | SEO titles and share images in the public API; client title overwrite? | **Still open** | No `meta_*`, `og_*` or `seo` field in any `app/Http/Resources/Api/*` resource. The server head honours overrides (guide §16), but `usePageMeta` replaces `document.title`/description with the plain entity values after load (guide §16 caution 2, §22 item 9). Crawlers that do not run JS see the server head, which is correct. Browser tabs and JS-rendering crawlers see the plain values. `og:*` is not touched by the client. |

---

## 10. Appendix — API guide vs. code discrepancies

> **Update at `3b3e806`:** D-1 is fixed (`price_max` alone is valid). D-3 is resolved in the guide, which now states 315 tests in 62 files with `.claude/**` excluded, and that matches the re-run. The endpoint count is now **19** (18 GET + 1 POST, `routes/api.php:23-44`). D-2, D-4, D-5, D-6 and D-7 were not re-examined and are presumed unchanged.

These were found by reading the code. PHP and Docker were not available, so they were **not executed**.

| ID | Guide says | Code says |
|---|---|---|
| D-1 | `price_max` can be used on its own (guide:698) | `'price_max' => ['sometimes','numeric','min:0','gte:price_min']` (`PublicArtworkIndexRequest.php:24`). Laravel's `gte` against an absent field compares with `null`, so validation likely fails with 422. Tests only cover both bounds (`ArtworkCatalogueApiTest.php:76,86`). The current FilterBar can send `price_max` alone. |
| D-2 | Empty-string params (`artist=`) are treated as absent (guide:702) | `ConvertEmptyStringsToNull` turns them into `null`, and the `integer`/`enum` rules then likely fail (422). The SPA is unaffected because `buildQueryString` drops `''`. |
| D-3 | 521 tests, including about 212 from `.claude/worktrees/` (guide:129, 1494) | That folder does not exist; the real count is **309**. |
| D-4 | Navigation `href` is `/{slug}` and never null (guide:457) | `"/{$slug}"` with a null localised slug gives `"/"` (`NavigationItemResource.php:22`), so such an item would link home. |
| D-5 | Homepage `exhibition` is the current or upcoming exhibition | There is no `type` filter, so a `news` or `announcement` row can be selected (`HomepageController.php:81-84`). |
| D-6 | "Curator order" | Correct, but there is no `id` tie-break for `wall`, `featured`, `similar`, artist `artworks` or home `faqs`, so equal `sort_order` values give non-deterministic order. |
| D-7 | A non-empty honeypot always returns 201 (guide:1078) | Only if the rest of the payload passes validation; otherwise it returns 422 (`EnquiryController.php:18-26`). |

Everything else checked matches the guide:
- 17 endpoints at `88e5407` (16 GET + 1 POST); 19 at `3b3e806` after `/genres` and `/mediums`
- field names and enums
- pagination (24 by default, 60 maximum)
- the CSP string
- rate limits (60/min read, 5/hour enquiries)
- cache TTLs
- the site-settings allow-list
- the navigation and social-link shapes

---

## 11. Execution status (2026-09-28)

The work ran in ten stages, each started by a written brief from the owner and closed with tests green, `npm run build` green and a visual check (1440 / 1280 / 1024 / 768 / 375, from stage 9 also 320, 414 and 667 × 375). The stage numbers below are the ones used during the work; they do not follow §8's numbering.

### 11.1 Stages

| # | Stage | Status | Commits |
|---|---|---|---|
| 0 | Sync with `origin/frontend`, API check, local demo content | done | `6a9e5ea`, `7050fab`, `18b3a76` (rebase follow-ups) |
| 1 | Design tokens and self-hosted fonts (Montserrat + Spectral) | done | `d1ddd21`, `de1bda0` |
| 2 | Header and footer on the tokens; social links in the footer only | done | `b12f8af`, `a61646f` |
| 3 | The shared wall module (`lib/wall.js`) | done | `a75765d`, `c5e2046` |
| 4 | True-size card and catalogue (filters, URL state, scale rule) | done | `977518b`, `7627d23`, `35f229f`, `6c53913` |
| 5 | Artwork page (viewer, "divarda gör", enquiry form) | done | `43e77df`, `f5c21e1`, `81275dd`, `c75bd3c` |
| 6 | Home page around the wall | done | `34aa5c9`, `3d0215e` |
| 7 | Artists list and artist page | done | `6a12a34`, `c3bebb1`, `071721b`, `52bd1f5` |
| 8 | Exhibitions, journal, contact, CMS pages, 404 | done | `17b4d9c`, `21e6580`, `cbe2ede` |
| – | Design pass: demo comparison, then logo, type scale, labels, home rhythm | done | `077f222` (comparison), `e7248eb`, `5d470f9`, `6104ffa`, `c8bda49`, `0a80fa6` |
| 9 | Mobile (320–768, landscape, touch targets, 14px floor, menu panel) | done | `2b28aee`, `f1f9720`, `92173e7`, `a96cf95`, `c166fab` |
| 10 | Final check: CSP, accessibility, performance, documents | done | `c2456d9` (accessibility), this document update |

State at the end: 76 test files, 567 tests, all passing; build green; no CSP violation on any public page (report-only mode, headless Edge, every main page).

### 11.2 Where we left the plan, and why

| Plan | What was done | Why |
|---|---|---|
| Archivo Narrow for display type (§6.1) | **Montserrat** (§6.3, stage 1) | The owner's decision at stage 1. Montserrat is ~20% wider, so the heading scale was set lower than the demo's (hero 72px, section 48px instead of 130 / 63). |
| Full-screen photo hero, stats band (§3.2, stage 5 row) | **Text hero** on the plain surface; no stats band | The wall must stay on the first screen (stage 6). The demo's hero image is AI-generated (C2PA: OpenAI gpt-image), not usable. |
| Scroll-pinned, draggable home wall with a 60 ms timer (R-1) | A plain horizontal scroller, keyboard-focusable, "1 / N" counter, no pinning, no drag, no animation | Accessibility and motion cost (Q-D-7); the physical model (k from height, 270 cm wall, 150 cm hang line, one k with the 170 cm figure) is kept. |
| Collection layout 0–6 (demo's staggered act) | A true-size grid at one k ("Seçilmiş əsərlər") | The demo's hand-set widths break true scale (40 cm shown at 28% next to 180 cm at 76%). |
| Artist accordion, artist tab row (§3.5, Q-D-5) | 4:5 portrait cards; no tab row | Portraits come from the API; a tab row does not scale past a handful of artists. |
| StickyContactBar (§7.3, stage 2 row) | Not built | On the demo it covers content; a phone-only version was considered in stage 9 and not needed. |
| Raster `logo_url` from site settings (Q-D-3) | **Inline SVG** from the brand book (`brand/`), `currentColor`: wine on light, wine-ink on wine | One drawing works on both surfaces; a raster cannot change colour. Proposed S11 (a second logo field) was dropped. |
| Error/success colours (Q-D-8) | Errors in `signal-ink` (counted in the Signal budget, error wins over the filter count); success in plain ink | No new hue; decided in stage 5. |
| Google Maps embed (S2) | A "Xəritədə aç" link (new window, `noopener noreferrer`) | CSP `frame-src` allows only youtube-nocookie; a map frame also tracks. |
| `buy` subject on the contact form | Left out of the contact page | The API answers 422 without an artwork code (guide §22.1); `buy` belongs to the artwork page's form. |
| Mobile gap on the vertical wall 43 cm | 20 cm, floor 48px; tallest work ≤ 60% of the viewport height | A stack is a list; on phones the 48px floor governs (20 cm × k is 20–28px). The height cap fixes landscape phones. |
| Rounded inputs (2px) | Radius 0 everywhere (`--radius-input: 0px`) | The brief allows no rounded corner. |

### 11.3 Open (not done)

- **Backend:** S9 (`artworks_count` on artists: the card shows it when it arrives), S10 (`portrait_url` on exhibition `artists[]`), S12 proposal (structured "steps" section), S1 (analytics: needs a CSP and consent decision). S3 is **resolved in the API** (the artwork's `artist` now carries `slug`): the `useArtistHref` workaround and the artist index in `SiteDataProvider` can be removed.
- **Frontend clean-up:** `BrandMark` is no longer used by the shell (kept with its tests); `LoadingState`, `EmptyState` and `ExhibitionCard` are used only by tests.
- **Content:** legal pages are `[PLACEHOLDER]`; site settings (address, phone, e-mail, hours) are empty locally; no artist portraits and no articles in the local data; real artwork photos.
- **Not measured here:** Lighthouse, CSP in *enforce* mode on a production server, real devices (all checks ran in headless Edge with device emulation).
