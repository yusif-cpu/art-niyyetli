#!/bin/sh
# Makes sure public/storage points at storage/app/public with a RELATIVE link, so it resolves the same way on the
# host, in the php-fpm container and in the nginx container (which all see the project at different absolute paths).
# A link made from the host (`php artisan storage:link` there) or by an older setup holds an absolute path that
# does not exist inside the containers, and every /storage/... media URL then returns 404.
#
# Local Docker only: production has its own deploy step (`php artisan storage:link --relative`, see README).
set -eu

APP_ROOT="${APP_ROOT:-/var/www/html}"
LINK="$APP_ROOT/public/storage"
TARGET="../storage/app/public"

mkdir -p "$APP_ROOT/storage/app/public" || echo "docker-entrypoint: could not create $APP_ROOT/storage/app/public" >&2

# Only ever replace a symlink or fill an empty slot; a real directory or file at public/storage is left untouched.
if [ -L "$LINK" ] || [ ! -e "$LINK" ]; then
    if [ "$(readlink "$LINK" 2>/dev/null || true)" != "$TARGET" ]; then
        ln -sfn "$TARGET" "$LINK" || echo "docker-entrypoint: could not create $LINK -> $TARGET" >&2
    fi
else
    echo "docker-entrypoint: $LINK exists and is not a symlink; leaving it alone" >&2
fi

exec "$@"
