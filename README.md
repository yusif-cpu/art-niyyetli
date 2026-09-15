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
