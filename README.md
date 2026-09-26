# ArtNiyyətli

A commercial art gallery platform: it represents artists, presents artworks, and lets visitors send purchase enquiries (no online payment in phase one). Everything visible on the public site — text, images, prices — is intended to be editable from an admin panel.

This repository currently contains the **Laravel backend foundation** (Phase 01). No domain features (artists, artworks, exhibitions, enquiries) are implemented yet — see [`work-files/backend-requirements-en.md`](work-files/backend-requirements-en.md) for the full requirements that later phases will build against.

## Local prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (v2, bundled with recent Docker installs)
- Git

No local PHP, Composer, or MySQL installation is required — everything runs inside Docker containers, with the application source bind-mounted from the host.

## Getting started

1. Copy the environment file and adjust values if needed:
   ```bash
   cp .env.example .env
   ```
   Set `DB_PASSWORD` and `MYSQL_ROOT_PASSWORD` to your own local values (the example file ships placeholders, not real credentials).

2. Build and start the containers:
   ```bash
   docker compose up -d --build
   ```

3. Install PHP dependencies and generate an application key (first run only):
   ```bash
   docker compose exec app composer install
   docker compose exec app php artisan key:generate
   ```

4. Run database migrations:
   ```bash
   docker compose exec app php artisan migrate
   ```

5. Visit the app at **http://localhost:8080**.

Uploaded media is served from `/storage/...`. The `app` container's entrypoint ([`docker/php/docker-entrypoint.sh`](docker/php/docker-entrypoint.sh)) creates the `public/storage` link for you on every start, as a **relative** link (`public/storage -> ../storage/app/public`) that resolves identically on the host and in both containers. You do not need to run `storage:link` yourself — and do not run it on the host, which creates an absolute host-path link that does not exist inside the containers (media URLs then return 404). If media 404s after an upgrade, run `docker compose up -d --force-recreate app`. (Production is unaffected: it keeps its own `php artisan storage:link` deploy step, see `.env.production.example`.)

Optional: load sample content (4 artists, 8 artworks, 2 exhibitions in AZ + EN, all marked as demo) for local development. It is idempotent, refuses to run in production and is not part of `db:seed`:
```bash
docker compose exec app php artisan db:seed --class=DemoContentSeeder
```
It creates no images; upload media in the admin to see artworks with pictures.

## Stopping the project

```bash
docker compose down
```

Add `-v` to also remove the MySQL data volume (destroys local database data):

```bash
docker compose down -v
```

## Running Artisan and other commands

Run any Artisan command inside the `app` container:

```bash
docker compose exec app php artisan <command>
```

Examples:

```bash
docker compose exec app php artisan migrate
docker compose exec app php artisan tinker
docker compose exec app php artisan route:list
docker compose exec app composer install
```

## Services

| Service     | Description                        | Host access             |
|-------------|-------------------------------------|--------------------------|
| `app`       | PHP-FPM 8.4 application container   | internal only (port 9000) |
| `webserver` | Nginx serving the Laravel app       | http://localhost:8080    |
| `mysql`     | MySQL 8.4 with a persistent volume  | localhost:3306            |

Application source code lives on the host filesystem and is bind-mounted into the `app` and `webserver` containers, so any file created or edited on the host (or inside the container) is immediately visible on both sides.

## Public API (Phase 09)

A read-only, versioned, locale-aware JSON API for a future separate public frontend. GET-only for the catalogue/content surface — the one exception is `POST /enquiries` (Phase 10, below), the artwork-enquiry submission endpoint.

**Base URL:** `http://localhost:8080/api/v1` (local Docker dev)

**Locale:** every endpoint accepts `?locale=az|en` (default `az`). Any other or missing value silently falls back to `az` — it is never a `422`. Translated text falls back **field by field**: an `en` request uses the `en` value for a given field when it exists and is non-empty, otherwise that same field's `az` value, otherwise `null`. This is per-field, never a whole-object fallback — one field can come from `en` while a sibling field on the same object falls back to `az`.

**Endpoints:**

| Method | Path | Notes |
|---|---|---|
| GET | `/homepage` | Hero/section copy, dynamic stats, wall, featured (max 6), artists, current/upcoming exhibition, home-page FAQs, social links |
| GET | `/pages` | Active pages (no `sections`) |
| GET | `/pages/{slug}` | One active page with active `sections` |
| GET | `/artists` | Active artists (light — no exhibitions/awards/artworks) |
| GET | `/artists/{slug}` | One active artist with exhibitions, awards, public artworks |
| GET | `/artworks` | Paginated catalogue with filters/sorting |
| GET | `/artworks/{inventoryCode}` | Full artwork detail + similar works |
| GET | `/exhibitions` | Paginated, `?filter=current\|upcoming\|archive` |
| GET | `/exhibitions/{slug}` | One active exhibition |
| GET | `/articles` | Paginated, published-only |
| GET | `/articles/{slug}` | One published article |
| GET | `/faqs` | Active FAQs |
| GET | `/site-settings` | Allowlisted business settings only |
| GET | `/social-links` | Active social links (`platform`, `url`, `display_mode`: `logo_text`/`logo_only`/`text_only`, `logo_url`, `sort_order`) |
| POST | `/enquiries` | Submit an artwork enquiry (Phase 10) — the only write route on the public API |

**Common query parameters:** `locale`, `per_page` (default 24, max 60 — out-of-range or non-numeric values silently normalize to 24), `page`.

**Artwork filters** (`GET /artworks`), combined with AND logic:

```
/api/v1/artworks?locale=en&artist=5&medium=oil&status=available&price_min=1000&price_max=5000&sort=price_asc
```

`artist` (numeric artist id), `genre`/`medium` (slug), `status` (`available|reserved|sold`), `price_min`/`price_max` (numeric), `sort` (`newest|price_asc|price_desc`, default is the gallery's configured `sort_order`).

**Exhibition filter:** `?filter=current|upcoming|archive`.

**Pagination envelope** (list endpoints):

```json
{
  "data": [ /* ... */ ],
  "meta": { "current_page": 1, "last_page": 3, "per_page": 24, "total": 61 },
  "links": { "first": "...", "last": "...", "prev": null, "next": "..." }
}
```

**Representative responses:**

Artwork card (`GET /artworks`):
```json
{
  "inventory_code": "AN-2026-014",
  "title": "Sunset Over Baku",
  "artist": { "id": 5, "name": "Aygün Məmmədova" },
  "image_url": "http://localhost:8080/storage/media/14/catalogue-webp.webp",
  "genre": { "slug": "painting", "name": "Painting" },
  "medium": { "slug": "oil", "name": "Oil on canvas" },
  "price": 3200.0,
  "currency": "AZN",
  "availability": "available",
  "width_cm": 80.0,
  "height_cm": 60.0
}
```
`price`/`currency` are `null` when the artwork's `show_price` flag is off; `availability` is always present (sold artworks stay public).

Artwork detail (`GET /artworks/{inventoryCode}`) adds `year_created`, `short_description`, `provenance`, `certificate`, `frame_condition`, `delivery_note`, `images` (each with `type`, `sort_order`, `is_main`, `url` — the `full` variant, distinct from the card's `catalogue` variant), and `similar` (up to 4 same-genre artwork cards).

Page with a section (`GET /pages/home`):
```json
{
  "data": {
    "slug": "home", "type": "home", "title": "Ana səhifə", "content": "...",
    "sections": [
      { "key": "hero", "heading": "Xoş gəldiniz", "body": "...", "sort_order": 0, "image_url": null }
    ]
  }
}
```

FAQ (`GET /faqs`):
```json
{ "id": 3, "question": "...", "answer": "...", "sort_order": 0 }
```

**Image URLs/variants:** every image field is a ready-to-use public URL (never a filesystem path or the original upload). Context picks the variant: `catalogue` for artwork list/card images, `full` for artwork detail images, `detail` for page sections, artist portraits, exhibition/article media. Each variant is served WebP-first with a JPEG fallback already baked into the URL the API returns — the frontend never has to choose a format.

**Errors** — always JSON, never a stack trace in production:
- `404` — unknown slug/inventory code, or the record isn't public (inactive/soft-deleted/draft).
- `422` — invalid filter/sort value, e.g. `?status=not-a-status` or `price_max < price_min`. Body: `{"message": "...", "errors": {"status": ["..."]}}`.
- `429` — rate limited: 60 requests/minute/IP on the read (GET) surface, or 5 requests/hour/IP on `POST /enquiries` specifically (its own separate limit, not shared with the read bucket).
- `405` — any non-GET method on a route other than `POST /enquiries`.

**CORS:** configured in `config/cors.php`, restricted to `PUBLIC_API_CORS_ORIGINS` (comma-separated origins in `.env`). When unset it defaults to the common localhost dev-server ports outside production and to **no origins in production** (the SPA is same-origin and needs none); an empty value means none in every environment. Only `GET`/`HEAD`/`OPTIONS` are allowed cross-origin unless `PUBLIC_API_CORS_ALLOW_POST=true` (for a separately hosted frontend submitting enquiries); requests may carry only the `Accept`, `Content-Type` and `X-Requested-With` headers, and preflights are cached for 10 minutes. Never a wildcard.

**Proxies:** when the app sits behind a reverse proxy, load balancer or CDN, set `TRUSTED_PROXIES` (comma-separated IPs/CIDRs, see `config/trustedproxy.php`) so rate limiting and HTTPS detection use the real client IP and scheme. Leave it empty when clients reach the web server directly: forwarded headers are then ignored.

### Enquiries (Phase 10)

`POST /api/v1/enquiries` lets a visitor enquire about an artwork from its detail page. Body: `{"name", "email", "phone"?, "message", "artwork_code", "website"?}` — `artwork_code` is the artwork's `inventory_code`; `website` is a honeypot field that must stay empty for real submissions. Success is `201 {"message": "Sorğunuz qeydə alındı."}`; validation failures (missing fields, unknown/inactive artwork code, or a sold artwork unless `ALLOW_SOLD_ENQUIRIES` is enabled) are `422`; more than 5 requests/hour/IP is `429`. A honeypot-triggered submission returns the identical `201` body but persists nothing and sends no email.

Every valid enquiry is saved (`enquiries` table) and triggers an email notification to the gallery's configured `contact_email` site setting, falling back to `ENQUIRY_NOTIFICATION_EMAIL` in `.env`. Notification delivery failure is logged but never rolls back the saved enquiry or affects the HTTP response — database success and email success are independent.

Admins manage enquiries under `/admin/enquiries` (list with `status`/`artwork_id`/`search`/date-range filters, detail, and status/internal-note updates only — enquiries are never admin-created or deleted), gated by the same `admin.access` Gate as every other admin resource. The artwork detail API response also gains a `whatsapp_link` field (`null` unless `GALLERY_WHATSAPP_NUMBER` is configured) for a link-based WhatsApp contact CTA.

## Project reference files

The [`work-files/`](work-files/) directory contains project reference materials (backend requirements, frontend design references, etc.). It is project context, not part of the application code — **do not modify it unless explicitly requested.**

## Troubleshooting

**Containers won't start / port already in use**
Check nothing else on the host is bound to ports `8080` or `3306`, then retry `docker compose up -d`.

**`app` container can't connect to MySQL**
MySQL takes a few seconds to become healthy on first start. `docker compose up -d` waits for the healthcheck before starting `app`; if it still fails, check logs:
```bash
docker compose logs mysql
```

**Changes on the host aren't reflected in the app**
Confirm the bind mount is intact:
```bash
docker compose exec app ls -la /var/www/html
```

**Uploaded images return 404 (`/storage/...`)**
`public/storage` is probably a stale absolute link (from running `php artisan storage:link` on the host). Recreate the `app` container so the entrypoint replaces it with the relative link:
```bash
docker compose up -d --force-recreate app
docker compose exec app ls -l public/storage   # -> ../storage/app/public
```

**"No application encryption key has been specified"**
Run:
```bash
docker compose exec app php artisan key:generate
```

**Resetting everything locally**
```bash
docker compose down -v
docker compose up -d --build
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
```
