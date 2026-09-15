# ArtNiyyətli — Phase 01: Laravel + Docker Foundation

## Objective

Set up the initial Laravel backend foundation for the ArtNiyyətli project inside the existing project directory.

The repository already exists on GitHub:

`https://github.com/yusif-cpu/art-niyyetli.git`

The current project directory already contains a `work-files/` directory with project reference materials.

## Mandatory context

Before doing anything:

1. Read `work-files/README.md`.
2. Read `work-files/backend-requirements-en.md`.
3. Inspect the contents of `work-files/` and identify the frontend design/demo reference files.
4. Do not modify, rename, delete, or move anything inside `work-files/`.
5. The backend requirements are the primary source of truth.
6. Frontend references are for understanding the public/admin flows and visual/data requirements; do not implement frontend in this phase.

## Important project principles

- Backend is the primary responsibility.
- The application must be production-oriented, secure, maintainable, and suitable for future expansion.
- Do not implement business features yet.
- Do not create the database schema yet.
- Do not create Artist, Artwork, Exhibition, Enquiry, SEO, translation, or other domain migrations/models yet.
- Do not invent requirements that are not documented.
- Keep the architecture clean so later phases can build on it.
- Do not expose secrets or credentials in the repository.

## Docker requirements

Create a local Docker development setup for the Laravel application.

The source code must remain on the host machine and be bind-mounted into the application container so files created/modified inside Docker are visible in the host project directory.

The setup should provide, at minimum:

- PHP/Laravel application container
- Web server suitable for local development
- MySQL database
- Redis only if genuinely useful for the foundation; otherwise leave it for a later phase
- Persistent MySQL volume
- Environment configuration through `.env`
- `.env.example` with safe placeholder values
- Docker healthchecks where appropriate
- A simple and documented way to start/stop the project

Do not put application source code only inside a Docker volume. The project source must stay on the host filesystem.

## Laravel requirements

Initialize or configure a clean Laravel application in the existing repository.

Use the project's available PHP/Laravel tooling where appropriate instead of reinstalling unrelated system software.

Keep the default Laravel structure unless there is a strong architectural reason to change it.

Configure:

- application environment
- database connection
- timezone appropriate for the project
- locale defaults appropriate for Azerbaijani
- filesystem/storage basics
- queue-ready configuration
- cache/session configuration suitable for local development

Do not add unnecessary third-party packages at this stage.

## Security baseline

Even though this is only the foundation phase:

- Never commit `.env`.
- Ensure `.gitignore` is correct.
- Do not hard-code credentials.
- Do not expose database passwords in source files.
- Keep debug enabled only for local development.
- Keep production configuration clearly separated through environment variables.
- Do not add insecure temporary authentication shortcuts.
- Do not disable Laravel security defaults just to make setup easier.

## Code quality

Use clear naming and conventional Laravel structure.

Avoid speculative abstractions.

Do not build a custom architecture framework on top of Laravel.

Prefer Laravel conventions unless there is a concrete project requirement that justifies otherwise.

## Documentation

Create a short project-level `README.md` if one does not already exist.

It should contain:

- project name
- purpose
- local prerequisites
- Docker startup commands
- how to stop containers
- how to run Artisan commands
- where project reference files are located
- a note that `work-files/` is project context and should not be modified unless explicitly requested
- basic troubleshooting for container/database startup

Do not document features that have not yet been implemented.

## Git safety

Before changing files:

- inspect the current Git status
- inspect the existing branch
- do not delete existing user work
- preserve the existing `work-files/` directory

After implementation:

- run the relevant Laravel/Docker checks
- verify the application can boot
- verify the application can connect to MySQL
- verify Artisan works
- verify the Docker-mounted source files are visible on the host

Do not force-push.
Do not reset the repository destructively.
Do not rewrite existing history.

## Expected result

At the end of this phase:

1. Laravel runs successfully in Docker.
2. MySQL is reachable from Laravel.
3. The source code is bind-mounted from the host filesystem.
4. `work-files/` remains untouched.
5. `.env` is ignored and `.env.example` exists.
6. Basic project documentation exists.
7. The repository is ready for the next phase: database schema and domain model design.

## Final report

When finished, report:

- files created/modified
- Docker services created
- exact commands used to start the project
- exact command used to verify Laravel
- exact command used to verify database connectivity
- any decisions or assumptions made
- any issues that remain

Do not start Phase 02 automatically.
