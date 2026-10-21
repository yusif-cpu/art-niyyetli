# ArtNiyyətli — Production Hosting Guide

This document covers **what must exist before the first deployment**: the server, domain, DNS, firewall, TLS, e-mail
delivery, secrets, backups and monitoring. The step-by-step deployment procedure is in [DEPLOY.md](DEPLOY.md); this file
deliberately does not repeat it.

## How to read this document

Every statement is tagged so that facts are not confused with proposals:

| Tag | Meaning |
|---|---|
| **CONFIRMED (repo)** | Read from this repository (Compose file, Dockerfile, nginx config, `.env.production.example`, code). |
| **CONFIRMED (brief)** | Given in the project brief by the team. Not verifiable from the repository. |
| **RECOMMENDED** | Good practice proposed here. Nothing in the repository requires or configures it. |
| **PENDING** | A decision or piece of information that is still open. Do not assume an answer. |

Commands that need root privileges are written with `sudo`. Commands that need production credentials say so.
Anything in `<ANGLE_BRACKETS>` is a placeholder you must replace. **No real secret appears in this file or may be added to it.**

Nothing in this document has been run against a production server: no server exists yet, and no certificate, DNS record
or mail provider has been configured.

---

## 1. Summary

| Item | Value | Status |
|---|---|---|
| Operating system | Ubuntu 24.04 LTS | CONFIRMED (brief) |
| Server size | 6 vCPU, 12 GB RAM, 100 GB NVMe | CONFIRMED (brief) — planned, not yet provisioned |
| Location | Germany | CONFIRMED (brief) |
| Domain | `artniyyatli.com` | CONFIRMED (brief) — see the spelling note below |
| Apex vs `www` as the canonical host | — | PENDING |
| Runtime | Docker Compose: PHP-FPM 8.4, nginx 1.27, MySQL 8.4 | CONFIRMED (repo) |
| TLS termination | Not handled by the repo's containers | CONFIRMED (repo); the solution is PENDING |
| SMTP provider | Brevo | **Proposed only — not confirmed, not configured** |
| Production Compose file | Does not exist in the repo | CONFIRMED (repo) |
| Backups, monitoring | Nothing in the repo | CONFIRMED (repo); the solution is PENDING |

**Spelling note (PENDING — please confirm).** The domain in the brief is `artniyyatli.com` ("a"), whereas the repository
uses "artniyyetli" ("e") in places: the default `MAIL_FROM_ADDRESS` in `.env.production.example` is
`hello@artniyyetli.az`, and the brand is "ArtNiyyətli". Confirm the exact production domain and the exact sender
address before DNS, TLS and e-mail are set up; the sender domain in particular must be one the team controls (section 8).

---

## 2. What the repository actually ships

Read these facts before planning the server, because they shape the options below.

**CONFIRMED (repo):**

- There is **one** Compose file, `docker-compose.yml`, and it is a **local-development** file. It defines three services:
  - `app` — PHP-FPM 8.4 (`docker/php/Dockerfile`), container user `www` (uid/gid 1000), listens on port 9000 inside the
    network only.
  - `webserver` — `nginx:1.27-alpine`, publishes `8080:80`, uses `docker/nginx/default.conf`.
  - `mysql` — `mysql:8.4` with the named volume `art-niyyetli-mysql-data`, a healthcheck, and, in the committed file,
    `ports: "3306:3306"`, which publishes the database on **all host interfaces**.
- The application source is **bind-mounted** (`./:/var/www/html`) into `app` and `webserver`. The image contains PHP
  extensions and Composer but **not** the application code, `vendor/` or Node. Dependencies are installed *inside the
  running `app` container* (`composer install`), and the frontend (`npm run build`) needs Node on the host or in a
  separate container.
- The nginx config listens on **port 80 only**. There is no TLS, no HTTP→HTTPS redirect, no certificate handling.
- `public/storage` (the link that serves uploaded media) is created automatically by the `app` container's entrypoint
  (`docker/php/docker-entrypoint.sh`) as a relative link. It must **not** be created with `php artisan storage:link` on
  the host (see [README.md](../README.md)).
- No queue worker, no scheduler and no Redis are provisioned. `routes/console.php` defines no scheduled task. The
  enquiry notification e-mail is sent in the PHP-FPM process after the visitor's response, with no retry
  (details in section 8).
- There are no backup scripts, no monitoring, no log shipping and no deployment automation in the repository.
- `php artisan app:preflight` exists and checks production readiness (APP_DEBUG, APP_URL, secure cookies, mailer, cache
  stores, `public/storage`, the frontend build, a leftover seeded test account, and more). It exits non-zero when a
  check fails in a production environment.

**Consequences for hosting:**

1. The committed Compose file must **not** be started unmodified on a public server (it exposes MySQL and an unencrypted
   web port on every interface). DEPLOY.md proposes a small override file for this.
2. A TLS-terminating reverse proxy must run **in front of** the `webserver` container. Where and how is PENDING (section 7).
3. Node (or a build container) is required wherever the frontend is built.

---

## 3. Server

**CONFIRMED (brief):** Ubuntu 24.04 LTS, 6 vCPU, 12 GB RAM, 100 GB NVMe, Germany.

**Sizing notes (CONFIRMED from repo config, RECOMMENDED interpretation):**

- PHP `memory_limit` is 256M (`docker/php/conf.d/local.ini`). Image uploads are decoded with GD and need roughly
  4–7 MB per megapixel (see `.env.production.example`, `MEDIA_MAX_PIXELS`). Memory is the resource to watch during bulk
  media uploads, not CPU.
- Upload limits are layered and must agree: the application limit is 10 MB per image (`config/media.php`), PHP allows
  12M per file / 13M per request, and nginx in the container allows 20M. **Any reverse proxy you add must also allow
  at least 20M** (`client_max_body_size`), otherwise uploads fail with `413`.
- The PHP-FPM pool is not tuned in the repo, so the official image defaults apply. Because the enquiry e-mail occupies a
  PHP-FPM worker after the response (section 8), do not shrink the pool aggressively. Pool sizing and MySQL memory
  settings are PENDING and best revisited once real traffic is known.
- 100 GB NVMe holds the OS, Docker images, the MySQL volume, originals **and** generated variants of every uploaded
  image, logs and local backups. Keep **off-server** copies of backups (section 11); do not rely on the same disk.

**RECOMMENDED baseline for the host:**

- Use the German provider's snapshot facility before major changes, in addition to the application backups below.
- Keep the system clock synchronised (Ubuntu 24.04 uses `systemd-timesyncd` by default). The application timezone is
  `Asia/Baku` (`APP_TIMEZONE`); the host can stay on UTC.
- Enable unattended security updates:
  ```bash
  sudo apt update && sudo apt install -y unattended-upgrades
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```

---

## 4. Access and information required before deployment

Collect all of this **before** the deployment day. Keep credentials in a password manager, not in chat, e-mail or Git.

| # | Needed | Why | Status |
|---|---|---|---|
| 1 | Server created, public IPv4 (and IPv6 if any) | DNS and firewall | PENDING |
| 2 | Root or sudo SSH access, with a key-based login for the deploy user | Server setup | PENDING |
| 3 | The deploy user's numeric uid (`id -u`) — it should be **1000** | The `app` container runs as uid 1000 and writes to the bind-mounted project directory (see DEPLOY.md) | PENDING |
| 4 | Registrar / DNS control for the domain | A/AAAA, mail records, CAA | PENDING |
| 5 | Decision: apex or `www` as canonical, and the redirect for the other | `APP_URL`, canonical URLs, sitemap, certificate names | PENDING |
| 6 | Git access to the repository from the server (deploy key or token, read-only) | `git clone` / `git pull` | PENDING |
| 7 | SMTP provider account, verified sender domain, SMTP credentials | Section 8 | PENDING |
| 8 | Enquiry recipient address (`ENQUIRY_NOTIFICATION_EMAIL` and/or the admin `contact_email` setting) | New-enquiry notifications | PENDING |
| 9 | Who creates the first administrator, and how (no CLI command exists — see DEPLOY.md) | Admin access | PENDING |
| 10 | Final legal copy for the legal pages. The seeder creates them with `[PLACEHOLDER]` text. | Launch content | PENDING (client) |
| 11 | Off-server backup destination and its credentials | Section 11 | PENDING |
| 12 | Uptime-monitoring contact(s) and alert channel | Section 12 | PENDING |
| 13 | Reverse-proxy / TLS approach (section 7) | HTTPS | PENDING |
| 14 | Whether media or the database will ever move off this single server | Affects rate limiting and cache settings (`.env.production.example`) | PENDING |

---

## 5. Software required on the server

**Docker Engine and the Docker Compose plugin (v2).** CONFIRMED (repo): the README requires Docker and Compose v2, and
the repo uses `docker compose` throughout.

- RECOMMENDED: install both from Docker's official apt repository, following the current instructions at
  <https://docs.docker.com/engine/install/ubuntu/>, rather than Ubuntu's older `docker.io` package. The repository does
  not pin a Docker version.
- If you use the proposed Compose override in DEPLOY.md, you need a Compose version that supports the `!reset` and
  `!override` tags (Compose v2.24.0 or newer). The override was rendered successfully with Compose v5.5.1; it has not
  been tested on the server.
- Membership of the `docker` group is effectively root access. Add only the deploy user.
- Image tags are floating minor tags (`php:8.4-fpm-alpine` base, `nginx:1.27-alpine`, `mysql:8.4`). Rebuilding with
  `--pull` picks up patch updates; pin by digest later if you need reproducible builds (PENDING decision).

**Git.** To clone and update the code.

**Node.js.** CONFIRMED (repo): the frontend is built with Vite 8, which requires Node `^20.19.0 || >=22.12.0`
(`node_modules/vite/package.json`); the repo's `.npmrc` sets `ignore-scripts=true`. `public/build` is git-ignored, so it
**must be built on each deploy** (on the server, or on a workstation/CI and copied over). The Docker images do not contain
Node. Either install a supported Node on the host or use a throwaway Node container (DEPLOY.md shows both).

**A TLS-terminating reverse proxy and certificate client.** PENDING (section 7).

**Optional but RECOMMENDED:** `ufw`, `fail2ban`, `curl`, `gzip`, and an off-site copy tool such as `rclone` or `restic`
(the tool is PENDING).

---

## 6. Domain and DNS

**CONFIRMED (brief):** domain `artniyyatli.com`. Everything else here is RECOMMENDED unless marked PENDING.

Create these records at the DNS provider (names are relative to the zone):

| Type | Name | Value | Notes |
|---|---|---|---|
| A | `@` | `<SERVER_IPV4>` | Required once the server exists |
| AAAA | `@` | `<SERVER_IPV6>` | Only if the server has IPv6 **and** the firewall/proxy listen on it; otherwise omit, because a dead AAAA record breaks visitors and certificate issuance |
| A / AAAA or CNAME | `www` | same as above or `@` | Only if `www` is used; PENDING decision (section 4, item 5) |
| CAA | `@` | `0 issue "letsencrypt.org"` | Optional hardening if Let's Encrypt is the CA |
| TXT / CNAME | various | provider-specific | SPF, DKIM, DMARC — see section 8 |

Notes:

- `APP_URL` must be the exact public origin **with `https`**. It drives canonical URLs, the sitemap, e-mail links and
  every media URL (`.env.production.example`). Choose apex or `www` once and redirect the other to it, so that canonical
  URLs and the sitemap agree.
- Lower the TTL (for example 300 s) a day before the cut-over and raise it afterwards.
- DNS must resolve to the server **before** requesting a certificate, because the certificate authority validates over
  port 80.

---

## 7. HTTPS / TLS

**CONFIRMED (repo):** the nginx container serves plain HTTP on port 80 and does nothing about certificates.
`SESSION_SECURE_COOKIE=true` is **required** in production and `app:preflight` fails if it is not, so the site must be
served over HTTPS before it goes live.

**PENDING decision:** where TLS terminates. Two realistic options:

| Option | Description | Trade-off |
|---|---|---|
| A. Reverse proxy on the host (**RECOMMENDED and used as the example in DEPLOY.md**) | nginx (or Caddy) on the host terminates TLS and proxies to the `webserver` container, which is published on `127.0.0.1:8080` only. Certificates come from Let's Encrypt via `certbot`. | Simple and standard; one more package to maintain. The container nginx config stays untouched. |
| B. Proxy as another container | A reverse-proxy container joins the Compose network. | Needs a new Compose service and certificate volume, which do not exist in the repo yet. |

Requirements that apply to either option:

- Redirect all HTTP to HTTPS; serve HTTPS on 443.
- Pass `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host` and `X-Forwarded-Port`. Set `X-Forwarded-For`
  to the connecting client address (overwrite it, do not append to a client-supplied value).
- Allow request bodies of at least 20M.
- The application must be told which peers to trust through `TRUSTED_PROXIES` (`config/trustedproxy.php`). If you leave it
  empty behind a proxy, every visitor shares one IP: one rate-limit bucket for the whole site, which can lock everyone
  out of the enquiry form and the admin login, and HTTPS is not detected. This is easy to get wrong because the address
  PHP sees is the one of the proxy hop *into the Docker network*, not the host proxy's own address; DEPLOY.md explains how
  to determine it.
- Certificate renewal must be automatic and verified (`certbot renew --dry-run`).
- `Strict-Transport-Security` is off by default (`SECURITY_HSTS=false`). Turn it on **only after** the whole site is
  confirmed to work over HTTPS, because browsers remember it for a year.
- The application already sets its own security headers, including a Content-Security-Policy (`SECURITY_CSP=enforce` in
  production). Do not duplicate them in the proxy.

---

## 8. E-mail (transactional SMTP)

### What the application sends today (CONFIRMED, repo)

| E-mail | Class | When | To |
|---|---|---|---|
| New enquiry notification | `NewEnquiryReceived` (job `SendEnquiryNotification`) | A visitor submits the enquiry form | The `contact_email` site setting, else `ENQUIRY_NOTIFICATION_EMAIL` |
| Enquiry reply | `EnquiryReplyMail` | An administrator replies to an enquiry in the admin | The enquirer's e-mail address |

There is **no order flow and no payment** in this project (see README: no online payment in phase one), so there are
**no order-confirmation e-mails**. If such e-mails are planned, they are not implemented and need separate work.

### How delivery behaves (CONFIRMED, repo — `.env.production.example`)

- No queue worker exists, so the notification is **not queued**: it is sent after the visitor's response, in the same
  PHP-FPM process, and is **not retried**. On failure the application logs `Enquiry notification failed to send` and the
  enquiry stays in the admin inbox. The enquiry is always saved first; e-mail success is independent of it.
- The reply e-mail is sent synchronously inside the admin request.
- `MAIL_MAILER` must not be `log` or `array` in production; those never deliver and `app:preflight` fails on them.
- `MAIL_TIMEOUT` (default 10 s) applies per network operation.

### Provider (PENDING)

**Brevo is a proposed SMTP provider, not a confirmed integration, and nothing is configured.** Until a provider is
chosen and a sender domain is verified, no e-mail will be delivered. Whatever the provider, take the exact SMTP host,
port, username and password/key from **that provider's own dashboard**; do not copy values from other documents.

Application settings involved (all in `.env`, names from `.env.production.example`):

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=<provider SMTP host>
MAIL_PORT=587
MAIL_SCHEME=null
MAIL_USERNAME=<provider SMTP login>
MAIL_PASSWORD=<provider SMTP password or key>   # secret
MAIL_TIMEOUT=10
MAIL_FROM_ADDRESS="<address on the verified sender domain>"
MAIL_FROM_NAME="${APP_NAME}"
ENQUIRY_NOTIFICATION_EMAIL=<gallery inbox>
```

- Port 587 with STARTTLS is what the template uses. Many hosts block outbound port 25; do not rely on it. For implicit TLS
  (port 465) consult the Laravel mail documentation for the framework version in `composer.lock` before changing
  `MAIL_SCHEME`.
- The template's default `MAIL_FROM_ADDRESS` is `hello@artniyyetli.az`. **Replace it** with an address on the domain you
  actually verify with the provider (see the spelling note in section 1).
- CONFIRMED (repo): both e-mails are sent *from* `MAIL_FROM_ADDRESS`. The notification carries the enquirer's address
  only as **Reply-To**; the admin reply carries the gallery's `contact_email` as Reply-To when it is set. Sending from the
  gallery's own domain keeps SPF/DKIM/DMARC alignment straightforward — never put the enquirer's address in `From`.

### Sender-domain authentication (RECOMMENDED)

Without these, mail to Gmail/Outlook-class providers is likely to land in spam or be rejected. The provider shows the
exact records to add; the shapes are:

| Record | Purpose | Shape (values come from the provider) |
|---|---|---|
| SPF (TXT on the sender domain) | Authorises the provider to send for the domain | `v=spf1 include:<provider-spf-domain> ~all` — there must be **one** SPF record per domain; merge includes if one exists |
| DKIM (TXT or CNAME) | Cryptographically signs the mail | Selector and key given by the provider |
| DMARC (TXT on `_dmarc.<sender domain>`) | Tells receivers what to do when SPF/DKIM fail and where to send reports | Start with `v=DMARC1; p=none; rua=mailto:<report mailbox>`, review the reports, then tighten to `quarantine`/`reject` |

Procedure: add the sender domain in the provider, add its SPF/DKIM records, wait until the provider shows the domain as
verified, add DMARC, then send a test message (DEPLOY.md, section on SMTP) and inspect the headers for `spf=pass`,
`dkim=pass`, `dmarc=pass`.

---

## 9. Firewall and SSH

**RECOMMENDED.** Do the SSH work from a second open session so that you cannot lock yourself out.

**SSH:**

- Key-based authentication only; disable password login and direct root login. In `/etc/ssh/sshd_config.d/`
  (a drop-in file). OpenSSH uses the **first** value it reads for a setting and reads drop-ins alphabetically, so name the
  file so that it sorts **before** any provider-supplied file such as `50-cloud-init.conf` — for example
  `00-hardening.conf`:
  ```text
  PasswordAuthentication no
  PermitRootLogin no
  ```
  then `sudo sshd -t && sudo systemctl reload ssh` (the service is `ssh` on Ubuntu 24.04) and confirm the effective
  values with `sudo sshd -T | grep -Ei 'passwordauthentication|permitrootlogin'`.
- Optionally restrict SSH to known source IPs at the provider's cloud firewall, and install `fail2ban`.
- Use a dedicated non-root deploy user with `sudo`. Remember that the `docker` group is root-equivalent.

**Host firewall (`ufw`):**

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Docker bypasses `ufw` for published ports.** A port published with `ports: "8080:80"` (or `3306:3306`) is reachable
from the internet even when `ufw` appears to block it, because Docker writes its own iptables rules. The reliable
protection is therefore **not publishing the port at all, or binding it to `127.0.0.1`** — which is exactly what the
proposed override in DEPLOY.md does for `webserver` (`127.0.0.1:8080`) and `mysql` (no published port). Verify from outside
the server (for example `nmap` or an online port scanner) that only 22, 80 and 443 respond.

**CONFIRMED (repo):** MySQL must never be reachable from the internet. The committed Compose file publishes it, which is a
local-development convenience only.

---

## 10. Secrets and environment configuration

**CONFIRMED (repo):** the filled-in `.env` / `.env.production` are git-ignored. `.env.production.example` is tracked and
contains no secrets. Never commit a filled-in copy.

| Secret | Where it lives | Notes |
|---|---|---|
| `APP_KEY` | server `.env` | Generated by `php artisan key:generate --force`. **Back it up.** Losing it invalidates sessions and anything encrypted. Never regenerate it on a live site. |
| `DB_PASSWORD` | server `.env` | Also used by Compose as the MySQL application user's password on the **first start only** |
| `MYSQL_ROOT_PASSWORD` | server `.env` | Used by Compose (`docker-compose.yml`). **It is missing from `.env.production.example`; add it by hand.** |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | server `.env` | From the SMTP provider |
| Git deploy key / token | server `~/.ssh` or credential store | Read-only access |
| Backup-destination credentials | wherever the backup tool keeps them | PENDING |
| First administrator's password | chosen by the administrator | Never stored in Git or in `.env` |

Rules:

- `chmod 600 .env` and keep the file owned by the deploy user (uid 1000). The nginx container can see the file through
  the bind mount, but its config denies requests for dotfiles; do not weaken that rule.
- **Never set `ADMIN_DEV_*` variables in production.** The development seeder throws if `ADMIN_DEV_PASSWORD` is present in a
  production environment.
- Use long random values, for example `openssl rand -hex 24`. Avoid `$` and `#` in values that Compose also reads.
- `.env.production.example` has `DB_HOST=CHANGE-ME`. With the repo's Compose file the database host is the service name
  **`mysql`** (port 3306).
- **Compose reads `.env` for interpolation** (`DB_PASSWORD`, `DB_USERNAME`, `DB_DATABASE`, `MYSQL_ROOT_PASSWORD`,
  `APP_ENV`), so the file must exist **before** `docker compose up`.
- `MYSQL_DATABASE`, `MYSQL_USER` and the two passwords only take effect when MySQL initialises an **empty** data volume.
  Changing them in `.env` later does **not** change the database. Rotate database passwords inside MySQL and in `.env`
  together.
- The MySQL healthcheck (`mysqladmin ping`) reports the server as up even if credentials are wrong, and it places
  the root password on the container's command line (visible to anyone who can run `docker inspect`). "Healthy" does not mean
  "credentials correct"; verify with a real query (DEPLOY.md).
- Keep a password-manager entry for every secret above, with a documented rotation owner.

**Production settings that must hold** (`app:preflight` checks most of them): `APP_ENV=production`, `APP_DEBUG=false`,
`APP_URL=https://…`, `SESSION_SECURE_COOKIE=true`, `LOG_LEVEL=warning` with `LOG_STACK=daily`, `SECURITY_CSP=enforce`,
`PUBLIC_API_CORS_ORIGINS` empty, a delivering `MAIL_MAILER`, `CACHE_STORE`/`CACHE_LIMITER_STORE` not `array`/`null`,
`TRUSTED_PROXIES` set correctly for the proxy, and the `ADMIN_DEV_*` variables absent.

---

## 11. Backup and recovery

**CONFIRMED (repo):** nothing automates backups. This section defines what must be backed up; the tooling is a PENDING
decision. **A backup that has never been restored is not a backup** — schedule a restore test (DEPLOY.md, section 14).

### What to back up

| Data | Location | Why it matters |
|---|---|---|
| **Database** | MySQL volume `<project>_art-niyyetli-mysql-data`, dumped logically with `mysqldump` | All content, enquiries, users, navigation, settings |
| **Uploaded media — original files** | `storage/app/private` (the `local` disk, `MEDIA_ORIGINAL_DISK`) | The only source from which variants can be produced. No command exists to regenerate variants, so treat originals as irreplaceable. |
| **Uploaded media — public variants** | `storage/app/public` (the `public` disk) | Served at `/storage/…`; restoring them avoids re-processing |
| **`.env`** | server project directory | All production configuration and secrets; store it encrypted, separately from the data |
| **`APP_KEY`** | inside `.env` | Keep an independent copy in the password manager |
| Proxy and TLS configuration | host nginx config, `/etc/letsencrypt` | Faster rebuild; certificates can also simply be re-issued |
| Any proposed Compose override file | project directory | It is not in Git until the team adds it |
| Application logs | `storage/logs` | Optional; useful for incident review |

The Compose project name is derived from the project directory name, so the volume is called
`<directory>_art-niyyetli-mysql-data` (for example `art-niyyetli_art-niyyetli-mysql-data` if the directory is
`art-niyyetli`). Back up the logical dump rather than the volume's raw files.

### Requirements (RECOMMENDED)

- **Frequency:** a database dump at least daily, and a media copy at least daily; take an extra database dump
  immediately before every deployment.
- **Off-server and encrypted:** at least one copy in a different location and, ideally, a different provider or account.
  Encrypt before upload; keep the key separately.
- **Retention:** for example 7 daily, 4 weekly, 6 monthly, adjusted to the client's needs (PENDING).
- **Recovery objectives:** the acceptable data loss (RPO) and downtime (RTO) are PENDING; they decide the backup frequency.
- **Restore drill:** restore the latest database dump and media into a scratch environment at least once before launch and
  then periodically; record the time it takes.
- **Monitoring of the backups themselves:** alert when a backup job fails or the newest file is older than expected.

Concrete commands for a database dump, a media archive and a restore test are in DEPLOY.md (section 14).

---

## 12. Monitoring, logging and maintenance

**CONFIRMED (repo):**

- Laravel logs go to `storage/logs/laravel-YYYY-MM-DD.log` with `LOG_STACK=daily`, keeping `LOG_DAILY_DAYS` files
  (default 14). The template sets `LOG_LEVEL=warning`: debug logs are large and may contain personal data.
- The container logs (nginx access/error, PHP-FPM, MySQL) go to Docker: `docker compose logs`.
- Laravel's health route is `/up`.
- The log line `Enquiry notification failed to send.` (level `error`) means an enquiry was saved but its e-mail was not
  delivered. This is the single most important application log message to alert on. The warning
  `Enquiry notification skipped: no recipient configured.` means neither the `contact_email` setting nor
  `ENQUIRY_NOTIFICATION_EMAIL` is set.

**RECOMMENDED:**

- **Docker log rotation.** Docker's default `json-file` driver does not rotate, so container logs can fill the disk.
  Set limits for all containers in `/etc/docker/daemon.json`, then restart Docker and recreate the containers (the setting
  applies to containers created afterwards):
  ```json
  { "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" } }
  ```
- **External uptime check** on `https://<DOMAIN>/up` (and on the home page), alerting a human, from a location other than
  the server.
- **Alerts** for: disk usage (host and Docker), memory pressure, a container that is not `Up`, certificate expiry (< 14
  days), backup failure, repeated `5xx`, and the enquiry-notification failure message above.
- **Patching:** apply OS security updates (unattended upgrades, section 3) and reboot when the kernel changes. All three
  services have `restart: unless-stopped`, so they return after a reboot **provided the Docker service is enabled at boot**
  (`sudo systemctl enable docker`).
- **Image updates:** periodically `docker compose build --pull` and `docker compose pull`, then redeploy during a quiet
  period, after a backup.
- **Dependency updates:** `composer.lock` and `package-lock.json` pin application dependencies; update them in Git, test, then
  deploy — never on the server.
- **Cache behaviour to know:** content changed *outside* the admin (SQL, tinker, seeders) can stay stale for up to 5 minutes
  (10 for the sitemap). Run `php artisan public-cache:flush` after such changes.
- **Capacity:** with one server, rate limits are per server; moving to several servers needs a shared limiter/cache store
  (see the comments in `.env.production.example`).

---

## 13. Decisions still open

| # | Decision | Needed for |
|---|---|---|
| 1 | Exact production domain spelling (`artniyyatli` vs the repo's `artniyyetli`), and apex vs `www` | DNS, TLS, `APP_URL`, sender address |
| 2 | TLS termination approach (host proxy vs container) and certificate client | HTTPS |
| 3 | SMTP provider (Brevo proposed), sender address, sender domain | E-mail delivery |
| 4 | Production Compose override: add it to the repository or keep it on the server | Reproducible deploys |
| 5 | How the first administrator account is created and by whom | Admin access |
| 6 | Backup tooling, destination, retention, RPO/RTO | Recovery |
| 7 | Monitoring tooling and alert channel | Operations |
| 8 | PHP-FPM pool and MySQL memory tuning | Performance |
| 9 | Whether to pin image digests / versions | Reproducibility |
| 10 | Final legal-page copy (seeded as `[PLACEHOLDER]`) | Launch content |
| 11 | Whether e-mail needs a real queue with retries (a worker + a shared queue backend) | Notification reliability |

---

## 14. Infrastructure readiness checklist

Tick every item before starting [DEPLOY.md](DEPLOY.md).

**Server and access**
- [ ] Ubuntu 24.04 LTS server provisioned (6 vCPU / 12 GB / 100 GB NVMe, Germany)
- [ ] Non-root deploy user with SSH key; its uid is 1000
- [ ] SSH: password login and root login disabled; verified from a second session
- [ ] `ufw` enabled with only SSH, 80 and 443 allowed
- [ ] Unattended security updates enabled
- [ ] Docker Engine + Compose plugin installed from the official repository; `docker compose version` works; Docker enabled at boot
- [ ] Docker log rotation configured
- [ ] Git read access from the server verified
- [ ] Node `^20.19 || >=22.12` available (or a build-elsewhere plan agreed)

**Domain and TLS**
- [ ] Exact domain and canonical host (apex/`www`) confirmed
- [ ] A (and AAAA if used) records point at the server; propagation checked
- [ ] TLS approach chosen; ports 80/443 reachable from the internet

**E-mail**
- [ ] SMTP provider chosen and account created (Brevo is only a proposal)
- [ ] Sender domain verified; SPF, DKIM and DMARC published and passing
- [ ] Sender address and enquiry recipient decided
- [ ] SMTP credentials stored in the password manager

**Secrets and data safety**
- [ ] Strong values generated for `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`; stored in the password manager
- [ ] Plan for `APP_KEY` backup
- [ ] Backup destination, schedule, retention and encryption decided; first restore drill scheduled
- [ ] Monitoring and alert channel decided

**Content**
- [ ] Client-supplied legal copy ready, or the placeholder pages are knowingly kept unlisted/unfinished at launch
- [ ] First-administrator process agreed

Next: follow [DEPLOY.md](DEPLOY.md).
