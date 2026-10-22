# ArtNiyyətli — Production Deployment Guide

A step-by-step procedure for deploying this repository to a production server. Infrastructure preparation (server,
DNS, firewall, mail provider, backups, monitoring) is covered in [HOSTING.md](HOSTING.md) and is a prerequisite; this
file does not repeat it.

## Read this first

**No server, certificate, DNS record or mail provider exists yet, and nothing in this guide has been run against
production.** Commands were checked against the repository (file paths, service names, artisan commands, flags) and,
where noted, against the local Docker environment. Steps that could only be verified by reading code say so.

Conventions:

- `$ …` runs as the **deploy user** (non-root, uid **1000**, member of the `docker` group). `$ sudo …` needs root.
- **[credentials]** marks a step that needs production secrets or accounts.
- `<ANGLE_BRACKETS>` are placeholders. `APP_DIR` is where the repository lives; `/srv/art-niyyetli` is only an example.
- All `docker compose …` commands run **inside `APP_DIR`**.
- Tags: **CONFIRMED (repo)** was read from the repository; **PROPOSED** does not exist in the repository and must be
  reviewed and tested on staging or on the first deploy; **PENDING** is an open decision (HOSTING.md, section 13).

### What the repository does and does not provide

| Fact | Consequence for this guide |
|---|---|
| Only `docker-compose.yml` exists, and it is a **local-development** file (bind mount, MySQL published on `3306:3306`, nginx on `8080:80`) | A small **PROPOSED override** (step 5) closes the ports; never run the base file alone on a public host |
| The images contain PHP + Composer but **not** the code, `vendor/` or Node | `composer install` runs in the `app` container; the frontend is built with Node on the host or in a throwaway container |
| nginx in the container serves **HTTP on port 80 only** | A TLS reverse proxy in front is required (step 10); the example is **PROPOSED** |
| `public/storage` is created by the `app` container's entrypoint | **Do not** run `php artisan storage:link` on the host (step 8) |
| No queue worker, no scheduler | Nothing to start besides the three services; e-mail is sent in the web request's process |
| No backup, monitoring or deploy automation | Steps 14 and HOSTING.md section 11/12 define them manually |

---

## Contents

1. [Pre-deployment checks](#1-pre-deployment-checks)
2. [Server access and initial preparation](#2-server-access-and-initial-preparation)
3. [Cloning or updating the repository](#3-cloning-or-updating-the-repository)
4. [Production environment configuration](#4-production-environment-configuration)
5. [Docker: override, build, start](#5-docker-override-build-and-start)
6. [Dependencies and frontend build](#6-dependencies-and-frontend-build)
7. [Database readiness, migrations, first data](#7-database-readiness-migrations-and-first-data)
8. [Storage and uploaded media](#8-storage-and-uploaded-media)
9. [Cache and configuration optimisation](#9-cache-and-configuration-optimisation)
10. [Reverse proxy, domain routing and SSL](#10-reverse-proxy-domain-routing-and-ssl)
11. [SMTP configuration and delivery check](#11-smtp-configuration-and-delivery-check)
12. [Production security settings](#12-production-security-settings)
13. [Health checks and smoke tests](#13-health-checks-and-smoke-tests)
14. [Backup and restore checks](#14-backup-and-restore-checks)
15. [Troubleshooting and rollback](#15-troubleshooting-and-rollback)
16. [Routine updates (after the first deploy)](#16-routine-updates-after-the-first-deploy)
17. [Updating from a release archive (no git checkout on the server)](#17-updating-from-a-release-archive-no-git-checkout-on-the-server)

---

## 1. Pre-deployment checks

Before touching the server:

**On the release commit** (a developer machine or CI — not the server):

- [ ] `main` contains exactly what should ship; note its SHA: `git rev-parse HEAD`.
- [ ] Backend tests pass: `docker compose exec app php artisan test`
- [ ] Frontend tests pass: `npx vitest run`
- [ ] The production build works: `npm run build`
- [ ] No filled-in `.env` is committed (`git ls-files | grep -E '^\.env'` shows only `.env.example` and `.env.production.example`).
- [ ] Tag the release so you can roll back to it: `git tag -a release-<YYYYMMDD> -m "<note>" && git push origin release-<YYYYMMDD>`
      (RECOMMENDED).

**Infrastructure:** every item in the HOSTING.md checklist (section 14) is ticked.

**Know your pending migrations.** CONFIRMED (repo): at the time of writing there are **61** migration files in
`database/migrations/`. On the **first** deploy the database is empty and all of them are pending. On later deploys, list
the new ones with `git diff --stat <previous-release>..<new-release> -- database/migrations`.

Data-touching migrations (so you know why a backup comes first on any database that holds data):

| Migration | What it does |
|---|---|
| `2026_09_20_000002_fix_singleton_page_placeholder_content` | Replaces the exact old seeded placeholder text on singleton pages; edited rows are untouched |
| `2026_09_23_000002_backfill_navigation_items_from_pages` | Creates navigation rows from pages and **inserts the four header route items (artworks, artists, exhibitions, articles)** |
| `2026_09_23_000003_drop_nav_placement_and_sort_order_from_pages` | **Drops two columns**. Its `down()` re-adds the columns but not their data, so `migrate:rollback` is not a true undo |
| `2026_09_26_000001_unlist_collectors_page` | Removes the collectors page from navigation and deactivates it (the page stays in the database) |

**The Journal rule** (needed again in step 13): the public site treats the Journal (`/articles`) as **closed — a real HTTP
404, absent from the sitemap — when no *visible* navigation item for the `articles` route exists** (header or footer).
On a fresh database the migrations above create that item, so the Journal starts **open**.

---

## 2. Server access and initial preparation

Do this once per server; skip what HOSTING.md already covered.

```bash
$ ssh <DEPLOY_USER>@<SERVER_IP>
$ id -u                      # must print 1000 (the app container runs as uid 1000)
$ docker compose version     # Compose v2; v2.24.0+ is needed for the override in step 5
$ git --version
$ node --version             # needs ^20.19.0 or >=22.12.0, unless you build the frontend elsewhere
$ sudo ufw status            # SSH, 80 and 443 only
```

If `id -u` is not 1000, the bind-mounted project files will not be writable by the `app` container (`www`, uid 1000).
Either use a uid-1000 deploy user, or fix ownership as described in the troubleshooting table (step 15). Do not "fix" it
with `chmod -R 777`.

---

## 3. Cloning or updating the repository

**First time:**

```bash
$ sudo mkdir -p /srv && sudo chown "$USER":"$USER" /srv     # example location only
$ git clone <REPO_URL> /srv/art-niyyetli                     # [credentials] deploy key or token
$ cd /srv/art-niyyetli
$ git checkout <RELEASE_TAG_OR_SHA>                          # deploy a named, known commit
$ git rev-parse HEAD                                         # record it in the deployment log
```

Keep the directory name `art-niyyetli`: Compose derives the project name from it, which names the MySQL volume
(`art-niyyetli_art-niyyetli-mysql-data`) and the network (`art-niyyetli_art-niyyetli`). Another name works but changes
those names everywhere in your notes.

**Updating later:** see step 16. Always check that the working tree is clean first (`git status`). A production checkout
must contain **no local edits to tracked files**; the only untracked files should be `.env` and the override file.
A server that receives a `git archive` instead of a checkout updates by step 17.

---

## 4. Production environment configuration

CONFIRMED (repo): `.env.production.example` is the production template; the filled-in `.env` is git-ignored.
**Compose reads `.env` for variable interpolation, so create it before any `docker compose up`.**

```bash
$ cp .env.production.example .env
$ chmod 600 .env
$ nano .env          # [credentials] fill in the values below
```

Values to set (everything else can stay at the template default; read the comments in the file):

| Variable | Value | Notes |
|---|---|---|
| `APP_ENV` | `production` | Template default |
| `APP_DEBUG` | `false` | Must stay false |
| `APP_URL` | `https://artniyyatli.com` | **Assumption:** apex is canonical — PENDING (HOSTING.md section 4). Must be the exact public origin with `https`. |
| `APP_KEY` | leave empty | Generated in step 6 |
| `DB_HOST` | `mysql` | **Replaces the template's `CHANGE-ME`**: the Compose service name |
| `DB_PORT` | `3306` | Template default |
| `DB_DATABASE` | `art_niyyetli` | Template default; matches Compose |
| `DB_USERNAME` | e.g. `art_niyyetli` | **Replaces `CHANGE-ME`**; Compose defaults to `art_niyyetli` if unset |
| `DB_PASSWORD` | strong random value | **[credentials]** `openssl rand -hex 24` |
| `MYSQL_ROOT_PASSWORD` | strong random value | **[credentials]** **Not in the template — add this line.** Compose requires it. |
| `SESSION_SECURE_COOKIE` | `true` | Template default; required |
| `SECURITY_CSP` | `enforce` | Template default (the intended production setting) |
| `SECURITY_HSTS` | `false` for now | Switched on in step 12 |
| `LOG_STACK` / `LOG_LEVEL` | `daily` / `warning` | Template defaults |
| `TRUSTED_PROXIES` | the Compose subnet, see step 10 | Required behind a proxy |
| `MAIL_*`, `ENQUIRY_NOTIFICATION_EMAIL` | see step 11 | PENDING provider |
| `PUBLIC_API_CORS_ORIGINS` | empty | Same-origin SPA |
| `ADMIN_DEV_*` | **must not exist** | The seeder throws in production if `ADMIN_DEV_PASSWORD` is present |

Also add (PROPOSED, step 5) so that plain `docker compose …` always includes the override:

```dotenv
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
```

With this line present, every `docker compose` command fails until `docker-compose.prod.yml` exists, so create that file
(step 5.1) before running any other Compose command.

Notes:

- The MySQL database, user and passwords are created **only when the data volume is empty** (first start). Changing them in
  `.env` later does not change the database.
- Store the final `.env` (encrypted) and the `APP_KEY` in the password manager. **Never commit `.env`.**
- The template's comment tells you to run `php artisan storage:link`. That applies to non-Docker deployments; in this setup
  the container does it (step 8).

---

## 5. Docker: override, build and start

### 5.1 Create the production override (PROPOSED)

The committed `docker-compose.yml` publishes MySQL on every interface and nginx on `8080`. Because **Docker bypasses `ufw`
for published ports**, the safe fix is to not publish them. Create `docker-compose.prod.yml` next to
`docker-compose.yml` (untracked on the server unless the team decides to add it to the repository — HOSTING.md,
decision 4):

```yaml
# docker-compose.prod.yml — PROPOSED production override. Not part of the repository.
services:
  mysql:
    ports: !reset []              # publish nothing: only the app container reaches MySQL, over the Compose network

  webserver:
    ports: !override
      - "127.0.0.1:8080:80"       # reachable only from the host, i.e. from the reverse proxy in step 10

networks:
  art-niyyetli:
    ipam:
      config:
        - subnet: 172.30.0.0/24   # pin a range that is unused on the host; TRUSTED_PROXIES in step 10 refers to it
```

Check what Compose will really do **before** starting anything. `docker compose config` renders the merged configuration
without starting containers; the `grep` keeps only the relevant lines. Never paste the unfiltered output anywhere, because it
contains your `.env` values (including passwords):

```bash
$ docker compose config | grep -E '^  [a-z-]+:$|^    ports:|published|host_ip|subnet'
```

Expected: `mysql` has **no** `ports:` section, `webserver` shows `host_ip: 127.0.0.1` with `published: "8080"`, and the
network shows `subnet: 172.30.0.0/24`. (This rendering was verified with Compose v5.5.1 against the repository's
`docker-compose.yml`; it has not run on the server.) If anything differs, **stop**.

### 5.2 Build and start

```bash
$ docker compose build --pull
$ docker compose up -d
$ docker compose ps
```

- Always build: the image holds the PHP configuration (`docker/php/conf.d/local.ini`, which sets the 256M memory limit and
  12M upload limits) and the storage-link entrypoint. A container started from an older image silently lacks them.
- Expected: `mysql` becomes `healthy`; `app` and `webserver` are `Up`. `app` waits for MySQL's healthcheck.
  `webserver` shows `127.0.0.1:8080->80/tcp`; `mysql` and `app` publish nothing to the host.
- "Healthy" only means MySQL answers `mysqladmin ping`. Credentials are verified in step 7.

If a container restarts in a loop, read `docker compose logs --tail 50 <service>` before doing anything else (step 15).

---

## 6. Dependencies and frontend build

**PHP dependencies** (inside the `app` container; Composer 2 is part of the image):

```bash
$ docker compose exec app composer install --no-dev --optimize-autoloader --no-interaction
```

**Application key** — **first install only**. Never regenerate it on a live site (it invalidates sessions and anything
encrypted):

```bash
$ docker compose exec app php artisan key:generate --force
$ grep -c '^APP_KEY=base64:' .env      # must print 1; back the key up now
```

**Frontend build** — `public/build` is git-ignored, so it must exist before the site works. The preflight check fails
without `public/build/manifest.json`.

Option A, Node on the host (CONFIRMED scripts: `npm run build` → `vite build`):

```bash
$ npm ci
$ npm run build
```

Option B, a throwaway Node container (PROPOSED; any image tag satisfying `^20.19.0 || >=22.12.0`):

```bash
$ docker run --rm -e HOME=/tmp --user "$(id -u):$(id -g)" -v "$PWD":/app -w /app node:22 sh -c 'npm ci && npm run build'
```

Option C, build on a workstation/CI and copy the `public/build` directory to the server. Whichever you use:

```bash
$ ls -l public/build/manifest.json
```

`node_modules/` is not needed at runtime afterwards. Ownership must stay with the deploy user so the `app` container can read it.

---

## 7. Database readiness, migrations and first data

### 7.1 Check the database connection (verifies the credentials)

```bash
$ docker compose exec app php artisan db:show
```

It must print the MySQL version, `Database  art_niyyetli` and `Host  mysql`. An access error here means the credentials in
`.env` do not match what MySQL was initialised with (see step 15).

### 7.2 Migrations

**First deploy** (empty database): all 61 migrations are pending.

```bash
$ docker compose exec app php artisan migrate:status | head -20        # everything "Pending"
$ docker compose exec app php artisan migrate --force
$ docker compose exec app php artisan migrate:status --pending         # must report nothing pending
```

**Every later deploy** (the database holds data) — do it in this order:

1. **Back up first** (step 14.1). A migration cannot be undone safely: rolling back is not a restore (see step 1).
2. Review what will run: `docker compose exec app php artisan migrate:status --pending`, and optionally the SQL with
   `docker compose exec app php artisan migrate --pretend`.
3. Put the site into maintenance mode, because old code and a new schema (or the reverse) must not serve traffic together:
   `docker compose exec app php artisan down --retry=60`
4. Update the code and dependencies (step 16), then `docker compose exec app php artisan migrate --force`.
5. `docker compose exec app php artisan up` after the smoke tests pass.

`--force` is required in production, otherwise Laravel prompts and the command aborts.

### 7.3 Seed the baseline data — first deploy only

```bash
$ docker compose exec app php artisan db:seed --force
```

`DatabaseSeeder` runs `RoleSeeder` (roles `administrator`, `editor`), `EnquirySubjectSeeder` (the enquiry subjects),
`AdminUserSeeder` (does nothing unless the forbidden `ADMIN_DEV_*` variables exist) and `PageSeeder` (home, about,
contact and the legal pages; the collectors page is created inactive and unlisted). The development test user is only created
in `local`/`testing`.

> **Run `db:seed` once. Do not re-run it on a live site.** `PageSeeder` re-applies parts of itself with `updateOrCreate`
> (despite the "create-if-missing" comment on its singleton pages, the legal pages and the header routes behave differently):
> it **resets the legal pages' titles, slugs and content to the `[PLACEHOLDER]` text** (and creates duplicate pages if an
> admin has changed one of those slugs), **resets the legal-page footer items to visible**, and **resets the four header route
> items to visible and to their default order** — which would silently re-open a Journal that the client had closed and undo
> navigation edits. If a missing seed row ever has to be restored, run the specific seeder
> (`--class=RoleSeeder`, `--class=EnquirySubjectSeeder`) instead.
>
> Never run `DemoContentSeeder` or `BenchmarkSeeder` on production (both refuse outside local/testing, but do not try).

### 7.4 Create the first administrator — PENDING decision

CONFIRMED (repo): there is **no artisan command** to create an administrator, and the development seeder is deliberately
disabled in production. Who does this, and whether a proper command should be added, is an open decision (HOSTING.md,
decision 5). Until that exists, the repository-supported mechanism is Tinker (`laravel/tinker` is a runtime dependency):

```bash
$ docker compose exec app php artisan tinker
```

```php
$u = App\Models\User::create(['name' => '<NAME>', 'username' => '<USERNAME>', 'email' => '<EMAIL>', 'password' => '<STRONG_PASSWORD>', 'is_active' => true]);
$u->roles()->attach(App\Models\Role::where('name', 'administrator')->firstOrFail()->id);
exit
```

- `User` hashes the password automatically (`'password' => 'hashed'` cast). The admin signs in with the **username**, and
  both `administrator` and `editor` roles may use the admin; only `administrator` can manage users.
- The password you type is stored in the shell/PsySH history. Remove it afterwards:
  `docker compose exec app sh -c 'find "$HOME" -name psysh_history -print -delete'`, and avoid putting it in `.env`.
- The admin application is served by the same host under `/admin`. Do not expose any other path for it.

---

## 8. Storage and uploaded media

CONFIRMED (repo): the `app` container's entrypoint (`docker/php/docker-entrypoint.sh`) runs on every start and makes
`public/storage` a **relative** symlink to `../storage/app/public`, so that it resolves identically on the host, in
PHP-FPM and in nginx. **Do not run `php artisan storage:link` on the host or in the container.** A link made on the host holds
a host path that does not exist inside the containers, and every `/storage/…` media URL then returns 404 (see the README).
(The "storage:link" step in `.env.production.example` is for non-Docker hosting.)

```bash
$ docker compose exec app ls -l public/storage
# expected:  public/storage -> ../storage/app/public
$ docker compose exec app sh -c 'test -w storage && test -w bootstrap/cache && echo writable'
```

- If the link is missing, absolute, or points at a host path, the running container is older than the entrypoint or the
  link was made by hand. (A link to `/var/www/html/storage/app/public`, as an old local image produced, happens to work inside
  the containers but is not what the current entrypoint creates.) Fix with
  `docker compose up -d --build --force-recreate app` and re-check. The preflight check in step 9 also tests that
  `public/storage` exists.
- Where media lives: **originals** in `storage/app/private`, **public variants** (WebP/JPEG sizes) in `storage/app/public`
  (`config/filesystems.php`, `config/media.php`). Both must be backed up (step 14).
- Upload limits: 10 MB per image in the application, 12M/13M in PHP, 20M in the container nginx — and 20M in the host proxy
  (step 10).
- Everything under `storage/` and `bootstrap/cache/` must be writable by uid 1000 (the rate limiter writes counters to
  `storage/framework/cache/data`, and a failure there breaks every throttled request).

---

## 9. Cache and configuration optimisation

Run these **after** `.env` is final (including `TRUSTED_PROXIES` and `MAIL_*` from steps 10–11), and again after every
`.env` change. Once config is cached, edits to `.env` are ignored until you re-cache.

```bash
$ docker compose exec app php artisan config:cache
$ docker compose exec app php artisan view:cache
$ docker compose exec app php artisan public-cache:flush
$ docker compose exec app php artisan app:preflight
$ echo $?     # 0 = production-ready
```

- `config:cache` is safe here: no `env()` call exists in `app/`, `routes/` or `bootstrap/` (checked by search). Only
  `database/seeders/AdminUserSeeder.php` reads `env()` directly, for the `ADMIN_DEV_*` variables that must not exist in production.
- **Do not run `route:cache` or `optimize`.** `routes/web.php` registers closure routes (the SPA shell handler and
  `/admin`), which Laravel cannot serialise. This was established by reading the code; the command was not run.
- `public-cache:flush` invalidates the cached site settings, navigation, homepage payload and sitemap. Run it after any
  deploy and after any change made outside the admin (SQL, tinker). Admin edits flush it automatically.
- `app:preflight` must pass in a production environment. Typical failures and their fixes: `APP_URL` is not https or is a
  local address; `SESSION_SECURE_COOKIE` is not true; `MAIL_MAILER` is `log`/`array`; `public/storage` or
  `public/build/manifest.json` is missing; a leftover `test@example.com` user exists. Warnings (e.g. `CACHE_STORE=database`)
  are acceptable on a single server.
- Composer's optimised autoloader was already produced in step 6 (`--optimize-autoloader`).

---

## 10. Reverse proxy, domain routing and SSL

CONFIRMED (repo): the container nginx speaks HTTP only. This step uses **Option A from HOSTING.md section 7** — nginx and
`certbot` on the host (**PROPOSED**; nothing here exists in the repository). Prerequisites: the DNS A record already points
to the server and ports 80/443 are open.

### 10.1 Install

```bash
$ sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

### 10.2 Site configuration

Create `/etc/nginx/sites-available/artniyyatli.conf` (`sudo`), initially HTTP only:

```nginx
server {
    listen 80;
    listen [::]:80;                     # remove this line if the server has no IPv6
    server_name artniyyatli.com;        # add "www.artniyyatli.com" if www is used (PENDING)

    client_max_body_size 20M;           # must be at least the container nginx's 20M, or uploads fail with 413

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $remote_addr;     # overwrite, never append a client-supplied value
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header X-Forwarded-Port  $server_port;
    }
}
```

```bash
$ sudo ln -s /etc/nginx/sites-available/artniyyatli.conf /etc/nginx/sites-enabled/
$ sudo rm -f /etc/nginx/sites-enabled/default
$ sudo nginx -t && sudo systemctl reload nginx
$ curl -sI http://artniyyatli.com/up | head -n 1       # HTTP/1.1 200 OK (still plain HTTP)
```

RECOMMENDED: add `server_tokens off;` inside the `http { … }` block of `/etc/nginx/nginx.conf` so the proxy does not
advertise its version, then `sudo nginx -t && sudo systemctl reload nginx`.

### 10.3 Obtain the certificate

```bash
$ sudo certbot --nginx -d artniyyatli.com          # add -d www.artniyyatli.com if www is used
```

`certbot` adds the HTTPS listener to the server block (the proxy settings above are kept) and a port-80 redirect.
Verify:

```bash
$ curl -sI http://artniyyatli.com/ | head -n 3          # 301 redirect to https://
$ curl -sI https://artniyyatli.com/up | head -n 1       # HTTP/2 200
$ sudo certbot renew --dry-run                          # renewal works
$ systemctl list-timers | grep -i certbot               # an automatic renewal timer exists
```

If both apex and `www` exist, make one the canonical host and 301-redirect the other to it, so that canonical URLs and the
sitemap agree with `APP_URL`.

### 10.4 Tell Laravel which proxy to trust

CONFIRMED (repo, `config/trustedproxy.php`): without `TRUSTED_PROXIES` every visitor shares one IP (one rate-limit bucket,
so the enquiry form and admin login can lock everyone out) and HTTPS is not detected.

The address PHP sees as the connecting peer is not the host proxy's own address: it is the **Docker bridge gateway** of the
Compose network, through which the host reaches `127.0.0.1:8080` (expected behaviour of Docker's port publishing, which
the check below confirms). That is why the override pins the subnet. In `.env`:

```dotenv
TRUSTED_PROXIES=172.30.0.0/24
```

(Use the subnet from your override. If you did not pin one, read it with
`docker network inspect art-niyyetli_art-niyyetli --format '{{(index .IPAM.Config 0).Subnet}}'` — but it can change if the
network is recreated.) Apply it:

```bash
$ docker compose exec app php artisan config:cache
```

Verify it works (after the first enquiry in step 13): the stored client address must be your real public IP, **not**
`172.30.0.1`.

```bash
$ docker compose exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SELECT id, ip_address, created_at FROM enquiries ORDER BY id DESC LIMIT 3"'
```

---

## 11. SMTP configuration and delivery check

PENDING: the provider (Brevo is only a proposal), the sender domain and the sender address (HOSTING.md section 8). Do
this step only after the sender domain shows as verified in the provider and SPF/DKIM/DMARC are published.

1. In `.env` set the `MAIL_*` values from the provider's dashboard, `MAIL_FROM_ADDRESS` to an address **on the verified
   domain** (replace the template's `hello@artniyyetli.az`), and `ENQUIRY_NOTIFICATION_EMAIL` to the gallery inbox. The
   admin `contact_email` site setting takes precedence over `ENQUIRY_NOTIFICATION_EMAIL` when it is set.
2. `docker compose exec app php artisan config:cache`
3. Send a real test enquiry (this exercises the same path as the website; the honeypot field must stay absent):

   ```bash
   $ curl -sS -X POST https://artniyyatli.com/api/v1/enquiries \
       -H 'Accept: application/json' -H 'Content-Type: application/json' \
       -d '{"name":"Deployment smoke test","email":"<A_MAILBOX_YOU_CONTROL>","message":"Deployment smoke test - please ignore","subject":"general_contact"}'
   ```

   Expected: HTTP 201 with `{"message":"Sorğunuz qeydə alındı."}`. The enquiry is saved **permanently** (the admin can change an
   enquiry's status but cannot delete it), so mark it clearly as a test in the admin. The endpoint allows 5 requests per hour
   per IP.
4. Check that the notification arrived at the recipient. In the message headers (Gmail: "Show original") confirm
   `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
5. Check the log for failures:

   ```bash
   $ docker compose exec app sh -c 'ls -t storage/logs/*.log | head -n 1 | xargs tail -n 40'
   ```

   `Enquiry notification failed to send.` means delivery failed (the enquiry is still in the admin inbox).
   `Enquiry notification skipped: no recipient configured.` means no recipient is set.
6. Reply to that test enquiry from the admin to a mailbox you control, to verify the second e-mail path.

Remember: nothing retries a failed notification. A provider outage means missed e-mails with the enquiries still visible
in the admin.

---

## 12. Production security settings

CONFIRMED (repo) settings and how to check them:

| Setting | Required value | How to verify |
|---|---|---|
| `APP_ENV` | `production` | `app:preflight` |
| `APP_DEBUG` | `false` | `app:preflight`; and a request to a missing page shows no stack trace |
| `SESSION_SECURE_COOKIE` | `true` | `app:preflight`; the admin session cookie has the `Secure` flag (browser developer tools) |
| `SECURITY_CSP` | `enforce` | `curl -sI https://artniyyatli.com/ \| grep -i content-security-policy` → header name is exactly `Content-Security-Policy`, not `…-Report-Only` |
| `SECURITY_HSTS` | `true` — **last**, see below | `curl -sI https://artniyyatli.com/ \| grep -i strict-transport` → `max-age=31536000` |
| `LOG_LEVEL` / `LOG_STACK` | `warning` / `daily` | `app:preflight` |
| `PUBLIC_API_CORS_ORIGINS` | empty | `app:preflight` |
| `TRUSTED_PROXIES` | the Compose subnet | step 10.4 |
| `ADMIN_DEV_*` | absent | `grep -c ADMIN_DEV .env` → `0` |
| MySQL port | not reachable | from another machine: `nc -zv <SERVER_IP> 3306` fails |
| Port 8080 | not reachable | `nc -zv <SERVER_IP> 8080` fails (it is bound to 127.0.0.1) |

**CSP.** The intended production value is `SECURITY_CSP=enforce` (the policy was reviewed clean in an earlier phase; see
the comments in `.env.production.example`). If something legitimate is blocked after a change, switch temporarily to
`report-only`, read the browser-console violations, fix the policy source (`App\Http\Middleware\SecurityHeaders`) and switch
back. Never add `'unsafe-inline'` or `'unsafe-eval'`.

**HSTS.** Browsers remember it for a year. Enable it only after steps 10–13 prove that the whole site works over HTTPS
(including the admin and media). Then set `SECURITY_HSTS=true` in `.env` and run
`docker compose exec app php artisan config:cache`. HSTS is only sent on requests the app recognises as HTTPS, which also
confirms that the proxy headers and `TRUSTED_PROXIES` work. The application sends no `includeSubDomains` or `preload`.

The application sets all other security headers itself (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy`); do not add them again in the proxy.

Also confirm: the file `.env` is not served (`curl -s -o /dev/null -w '%{http_code}\n' https://artniyyatli.com/.env` is not
`200`; the container nginx denies dotfiles), and no filled-in `.env` is tracked by Git.

---

## 13. Health checks and smoke tests

Replace the domain if different. All of these are read-only except where marked.

### 13.1 Containers

```bash
$ docker compose ps                         # mysql healthy; app and webserver Up
$ docker compose logs --tail 30 webserver   # no [emerg] / "host not found in upstream"
$ docker compose logs --tail 30 app         # "fpm is running", no errors
$ docker compose logs --tail 30 mysql       # "ready for connections"
```

### 13.2 HTTP smoke tests

```bash
$ curl -s -o /dev/null -w '%{http_code}\n' https://artniyyatli.com/up                    # 200
$ curl -s -o /dev/null -w '%{http_code}\n' https://artniyyatli.com/                      # 200
$ curl -s -o /dev/null -w '%{http_code}\n' https://artniyyatli.com/this-page-does-not-exist   # 404 (a real 404 status)
$ curl -s -o /dev/null -w '%{http_code}\n' https://artniyyatli.com/api/v1/homepage       # 200
$ curl -s -o /dev/null -w '%{http_code}\n' https://artniyyatli.com/admin                 # 200 (the admin app shell)
$ curl -s https://artniyyatli.com/robots.txt                                             # references the https sitemap URL
$ curl -s https://artniyyatli.com/sitemap.xml | head -n 8                                # <loc> entries start with https://artniyyatli.com
```

### 13.3 The Journal check (post-deployment configuration check)

The Journal is open only if a visible `articles` navigation item exists. Check both the signal the website uses and the result:

```bash
$ curl -s https://artniyyatli.com/api/v1/navigation | grep -o '"route_key":"articles"'   # prints the match when the item is visible
$ curl -s -o /dev/null -w '%{http_code}\n' https://artniyyatli.com/articles               # 200 when open, 404 when closed
$ curl -s https://artniyyatli.com/sitemap.xml | grep -c '/articles'                       # >0 when open, 0 when closed
```

These three must agree. **Decide deliberately which state is wanted at launch.** If the Journal should be open but the
checks show it closed, the navigation item was hidden or deleted: re-enable or re-add it in the admin under Navigation (the
`articles` route), or restore it from a backup — do not re-run `db:seed` (step 7.3). If it should be closed, the same three
checks confirm a real 404 and an absent sitemap entry. A closed Journal is expected behaviour, not an error.

### 13.4 Security and network

```bash
$ curl -sI https://artniyyatli.com/ | grep -i -E 'content-security-policy|strict-transport|x-powered-by|server'
$ curl -sI http://artniyyatli.com/ | head -n 3     # 301 to https
```

From a **different machine**: `nc -zv <SERVER_IP> 22 80 443` succeed; `nc -zv <SERVER_IP> 3306 8080` fail.

### 13.5 Functional checks in a browser

- [ ] Home page, an artist page, an artwork page and the catalogue load; images appear (media URLs are `https://…/storage/…`).
- [ ] Language switch (AZ/EN) works; the header/footer navigation matches the admin's Navigation settings.
- [ ] The contact/enquiry form submits (step 11 test) and shows its success state.
- [ ] Admin: sign in over HTTPS, upload one test image to Media, confirm its variants load from `/storage/…` and the file
      appears under `storage/app/private` (original) and `storage/app/public` (variants); then delete the test image in the admin.
- [ ] Legal pages (privacy policy, shipping & returns, copyright) show final copy, not `[PLACEHOLDER]` text — PENDING from the client.
- [ ] Site settings (contact e-mail, phone, address, social links) are filled in the admin.
- [ ] The enquiry notification reached the gallery inbox (step 11) and the stored `ip_address` is the real client IP (step 10.4).

### 13.6 Post-deployment checklist

- [ ] `app:preflight` exits 0 · [ ] `migrate:status --pending` empty · [ ] HTTPS valid and auto-renewal dry-run passes
- [ ] MySQL and port 8080 unreachable from outside · [ ] CSP `enforce` header present · [ ] HSTS enabled last
- [ ] Journal state is as intended and consistent (13.3) · [ ] Test e-mail received with SPF/DKIM/DMARC pass
- [ ] First backup taken **and a restore test passed** (step 14) · [ ] Monitoring and alerts active (HOSTING.md section 12)
- [ ] Deployment recorded: date, release tag, `git rev-parse HEAD`, who deployed

---

## 14. Backup and restore checks

Tooling and off-site storage are PENDING (HOSTING.md section 11). These commands are the manual building blocks.
The `mysqldump` options were checked against the client shipped in `mysql:8.4`; an authenticated dump and restore were **not**
executed (no production credentials exist yet), so run the restore test below on the first day.

`$MYSQL_ROOT_PASSWORD` and `$MYSQL_DATABASE` are expanded **inside the MySQL container**, where Compose provides them; the
single quotes keep your shell from expanding them.

### 14.1 Database backup **[credentials]**

```bash
$ mkdir -p ~/backups && chmod 700 ~/backups
$ set -o pipefail
$ docker compose exec -T mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --no-tablespaces --routines --triggers "$MYSQL_DATABASE"' \
    | gzip > ~/backups/art_niyyetli-$(date +%F-%H%M).sql.gz
$ gzip -t ~/backups/art_niyyetli-*.sql.gz && zcat "$(ls -t ~/backups/art_niyyetli-*.sql.gz | head -n 1)" | tail -n 1
# the last line of a complete dump reads:  -- Dump completed on <date>
```

`--single-transaction` gives a consistent snapshot without locking the site. Take one of these **before every deployment that
contains migrations**.

### 14.2 Media and configuration backup

```bash
$ tar -czf ~/backups/media-$(date +%F).tar.gz storage/app/public storage/app/private
$ gpg --symmetric --cipher-algo AES256 --output ~/backups/env-$(date +%F).gpg .env    # encrypted copy of the secrets file
```

For regular runs, prefer an incremental tool (`rsync`, `rclone`, `restic` — PENDING) over full archives, and copy everything
**off the server**. Do not leave `.env` copies unencrypted anywhere.

### 14.3 Restore test (scratch database — touches no live data)

```bash
$ docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE art_niyyetli_restore_test"'
$ zcat ~/backups/<BACKUP_FILE>.sql.gz | docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" art_niyyetli_restore_test'
$ docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "SELECT COUNT(*) FROM art_niyyetli_restore_test.migrations; SELECT COUNT(*) FROM art_niyyetli_restore_test.artworks; SELECT COUNT(*) FROM art_niyyetli_restore_test.enquiries;"'
```

The counts must equal the live database's. Then remove the scratch database:

```bash
$ docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE art_niyyetli_restore_test"'
```

Also test the media archive: `tar -tzf ~/backups/media-<DATE>.tar.gz | head`, and periodically restore it into a scratch directory
and open a few files. Record how long the whole restore took.

### 14.4 Restoring the live site (disaster recovery or rollback)

1. `docker compose exec app php artisan down --retry=60`
2. Import the dump into the live database. The dump contains `DROP TABLE IF EXISTS` statements, so the import **replaces**
   the tables: `zcat ~/backups/<FILE>.sql.gz | docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'`.
   Everything written after that backup is lost — this is a decision for a human, not a script.
3. Restore media if needed: `tar -xzf ~/backups/media-<DATE>.tar.gz -C .` (run in `APP_DIR`).
4. `docker compose exec app php artisan public-cache:flush`, re-run the smoke tests, then `docker compose exec app php artisan up`.

On a completely new server: HOSTING.md first, then steps 3–10 of this guide with the **restored** `.env` (same `APP_KEY`), import the
dump instead of running `migrate` and `db:seed`, and restore the media archive.

---

## 15. Troubleshooting and rollback

### 15.1 Stop-rules (data safety)

- **Never** run `docker compose down -v`, `docker volume rm`, `docker volume prune` or `docker system prune --volumes`: they delete
  the MySQL volume. `docker compose down` (without `-v`) and `docker compose restart` are safe.
- Never run `migrate:fresh`, `migrate:refresh` or `db:wipe` against production.
- Never re-run `db:seed` on a live site (step 7.3), and never regenerate `APP_KEY` on a live site.
- Take a database backup before anything that is not a pure read.

### 15.2 Common problems

| Symptom | Likely cause | What to do |
|---|---|---|
| `webserver` restarting; log says `host not found in upstream "app"` | The container lost its network attachment (seen after a Docker restart), or `app` is down | `docker compose up -d`; if the webserver is still detached: `docker compose up -d --force-recreate --no-deps webserver`. Data is not affected. |
| `502 Bad Gateway` from the host proxy | `webserver` is down or not on `127.0.0.1:8080` | `docker compose ps`; `curl -sI http://127.0.0.1:8080/up` on the server |
| `502`/`upstream` errors in the container nginx log | `app` (PHP-FPM) is down | `docker compose logs app`; `docker compose up -d app` |
| `413 Request Entity Too Large` on upload | Host proxy `client_max_body_size` too small | Set `20M` (step 10.2), reload nginx |
| `500`, log says permission denied on `storage/…` or `bootstrap/cache` | Project files not owned by uid 1000 | `sudo chown -R 1000:1000 storage bootstrap/cache` (and `public/build` if needed) — only after confirming the intended owner |
| `No application encryption key has been specified` | `APP_KEY` empty | First install only: `php artisan key:generate --force`; on an existing site restore the original key instead |
| Images return 404 under `/storage/…` | `public/storage` is missing or absolute | Step 8: `docker compose up -d --build --force-recreate app` |
| Site is blank / assets 404 | `public/build` missing or stale | Rebuild (step 6) and `docker compose exec app php artisan view:clear` |
| Everyone gets `429`, or the admin login locks everyone out | `TRUSTED_PROXIES` wrong, all visitors seen as one IP | Step 10.4; `config:cache`; check `ip_address` of a new enquiry |
| Admin login loops or the session is lost over HTTPS | App not detecting HTTPS (missing `X-Forwarded-Proto` or untrusted proxy), or `APP_URL` mismatch | Check the proxy headers (10.2), `TRUSTED_PROXIES`, `APP_URL`; `config:cache` |
| `.env` change has no effect | Configuration is cached | `docker compose exec app php artisan config:cache` |
| MySQL container will not start on first run | `MYSQL_ROOT_PASSWORD` empty or unset | `docker compose logs mysql`; set it in `.env`. (Only affects an empty volume.) |
| `Access denied for user` after editing `DB_PASSWORD` | The MySQL password only applies at volume initialisation | Change the password inside MySQL (`ALTER USER`) **and** in `.env`, or restore the previous value |
| No notification e-mails | Provider/credentials/port, sender not verified, no recipient | Step 11, section 5; provider dashboard; `MAIL_*`; log lines in step 11 |
| `/articles` is 404 and the Journal is missing from the sitemap | The Journal navigation item is hidden or deleted | Step 13.3 |
| Content edited outside the admin does not show | Public cache | `php artisan public-cache:flush` |
| Disk filling up | Docker logs without rotation, old backups, large media | `docker system df`, `du -sh /var/lib/docker/containers/*` (sudo), configure log rotation (HOSTING.md section 12). Do **not** prune volumes. |

Useful commands: `docker compose logs -f --tail 100 <service>`, `docker compose exec app php artisan about`,
`docker compose exec app php artisan route:list`, `docker compose exec app php artisan app:preflight`.

### 15.3 Rollback

Decide first whether the failed deploy included migrations.

**A. No migrations ran (code-only release):**

```bash
$ docker compose exec app php artisan down --retry=60
$ git checkout <PREVIOUS_RELEASE_TAG>                    # detached HEAD is fine on a server; see step 16 for returning to a branch
$ docker compose exec app composer install --no-dev --optimize-autoloader --no-interaction
$ npm ci && npm run build                                # or restore the previous public/build copy
$ docker compose exec app php artisan config:cache && docker compose exec app php artisan view:cache
$ docker compose exec app php artisan public-cache:flush
$ docker compose exec app php artisan up
```

**B. Migrations ran:** do **not** rely on `migrate:rollback`. Some migrations are not meaningfully reversible (for example the
one that drops page columns; its `down()` does not restore their data). Instead:
`php artisan down` → restore the pre-deployment database dump (step 14.4; data written since is lost) → check out the
previous release → rebuild as in A → `php artisan up`.

**C. Emergency stop:** `docker compose exec app php artisan down` serves the maintenance response while you investigate; nothing
else changes. `docker compose stop` stops the containers and keeps all data.

After any rollback: run the smoke tests (step 13), record what happened, and keep the failed release's tag for analysis.

---

## 16. Routine updates (after the first deploy)

An ordered summary; each item refers to the step above.

1. Pre-checks on the new release (step 1), including the migration list. Tag it.
2. `git status` on the server is clean. Take a **database backup** (14.1) and a media backup if media changed.
3. If the release has migrations: `docker compose exec app php artisan down --retry=60`.
4. `git fetch --tags origin && git checkout <NEW_RELEASE_TAG>` (or `git pull --ff-only` if you track a branch).
5. If `Dockerfile`, `docker/` or the Compose files changed: `docker compose build --pull && docker compose up -d`. Otherwise
   the running containers are enough.
6. `docker compose exec app composer install --no-dev --optimize-autoloader --no-interaction`
7. Rebuild the frontend: `npm ci && npm run build` (step 6).
8. If the release has migrations: `docker compose exec app php artisan migrate --force` (step 7.2). Do **not** run `db:seed`.
9. `docker compose exec app php artisan config:cache && docker compose exec app php artisan view:cache && docker compose exec app php artisan public-cache:flush`
10. **Ownership and write check** of `storage/` and `bootstrap/cache/` (below). Repair before going on.
11. `docker compose exec app php artisan app:preflight` → exit 0.
12. `docker compose exec app php artisan up` (if it was down), then the smoke tests (step 13), including the Journal check.
13. Record the deployment (date, tag, SHA, migrations run) and keep the pre-deployment backup until the release has proved stable.

Returning to a branch after checking out a tag: `git checkout main && git pull --ff-only`.

### 16.1 Ownership and write check (after every update)

Laravel writes to `storage/` (cache, compiled views, sessions, logs, uploaded media) and `bootstrap/cache/` as the app
container's user — `docker compose exec app id -u`, uid **1000** (`www`) in this image. Anything there owned by another
user (typically root, after a `sudo` command or a root `tar`) silently breaks the rate limiter, view compilation and
uploads; `app:preflight` reports it only for the rate-limiter directory.

```bash
$ cd /srv/art-niyyetli                                   # the deployment directory
# 1. Nothing under storage/ or bootstrap/cache/ belongs to anyone but the app user (expect no output):
$ sudo find storage bootstrap/cache \! -uid 1000 -print | head
# 2. The app user can write everywhere Laravel writes (expect only "ok" lines):
$ docker compose exec -T app sh -c 'for d in storage/framework/cache/data storage/framework/views storage/framework/sessions storage/logs storage/app/public bootstrap/cache; do test -w "$d" && echo "ok $d" || echo "NOT WRITABLE $d"; done'
```

If step 1 lists anything or step 2 prints `NOT WRITABLE`: give exactly those back to the app user, which changes
ownership only, no content — `sudo find storage bootstrap/cache \! -uid 1000 -exec chown 1000:1000 {} +` — then `docker compose exec app php artisan view:clear &&
docker compose exec app php artisan view:cache` (a view cache written while the directory was not writable is
incomplete) and run both checks again.

---

## 17. Updating from a release archive (no git checkout on the server)

For a server that holds an extracted `git archive` instead of a clone (the staging server). The archive carries tracked
files only: `.env`, the override file, `vendor/`, `node_modules/`, `public/build/` and the uploaded media under
`storage/app/public/` are not in it and are left as they are. The archive does contain the `.gitignore` files that keep
`storage/**` and `bootstrap/cache/` in git — so extracting it touches those directories.

1. On a workstation, from a clean `main` at the release commit:

   ```bash
   $ git archive --format=tar.gz -o artniyyetli-<SHA>.tar.gz <SHA>
   $ tar -tzf artniyyetli-<SHA>.tar.gz | grep -E '^(\.env|vendor/|node_modules/|public/build/)' && echo STOP   # expect nothing
   $ scp artniyyetli-<SHA>.tar.gz root@<SERVER>:/root/
   ```

2. On the server, extract **with `--no-same-owner`**. Run as root without it, tar gives every directory in the archive
   the archive's owner (root) — `storage/`, `storage/framework/{cache,cache/data,sessions,views}`, `storage/logs`,
   `bootstrap/cache` included — and the app can no longer write there:

   ```bash
   $ cd /srv/art-niyyetli
   $ sudo tar --no-same-owner -xzf /root/artniyyetli-<SHA>.tar.gz -C /srv/art-niyyetli
   $ echo <SHA> | sudo tee REVISION
   # tar (run as root) still creates the files it writes as root — the code and the storage/**/.gitignore files it
   # replaces. Give exactly those to the app user; files already owned by it (the uploaded media) are not touched:
   $ sudo find . \! -uid 1000 -exec chown 1000:1000 {} +
   ```

3. Files deleted in the new release stay on the server after an extraction. If the release removes files (`git diff
   --name-status <OLD_SHA> <SHA> | grep '^D'`), delete them by hand.

4. Continue with step 16 from item 5 (images, `composer install --no-dev`, the frontend build, migrations only if the
   release has any, caches), then **16.1**, `app:preflight` and the smoke tests. The frontend build runs as the app user:

   ```bash
   $ docker run --rm -u 1000:1000 -e HOME=/tmp -v /srv/art-niyyetli:/app -w /app node:22-alpine sh -c 'npm ci && npm run build'
   ```
