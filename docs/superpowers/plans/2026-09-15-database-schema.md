# ArtNiyyətli Database Schema (Phase 02) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the final relational database schema, Laravel migrations, and the minimal Eloquent models/tests needed to make that schema coherent, per `work-files/art-niyyetli-phase-02-database-schema.md`.

**Architecture:** MySQL-backed, fully normalized schema using parent + `*_translations` tables for every text-bearing entity (locale `az`/`en`, no `languages` table). Reusable polymorphic `media` system. PHP backed enums (`App\Enums\*`) replace DB `ENUM` columns for controlled vocabularies (availability, statuses, types). Soft deletes only on `artists`, `artworks`, `exhibitions`, `articles`, `media`. Foreign keys default to `restrictOnDelete()` for core/historical relationships (artist→artwork, artwork→enquiry, artwork/artist↔exhibition, any `*_id` pointing at `media`) and `cascadeOnDelete()` only for a row's own dependent children (translations, artist's own exhibition/award sub-records, page's own sections/FAQs, pivot rows on the "collection" side).

**Tech Stack:** Laravel 13 / PHP 8.4, MySQL 8.4 (Docker), Pest/PHPUnit (SQLite `:memory:` for the test DB, per existing `phpunit.xml`), Laravel Pint.

**Spec:** `work-files/art-niyyetli-phase-02-database-schema.md` (read-only; do not modify). Also cross-referenced: `work-files/backend-requirements-en.md`.

## Global Constraints

- Do not modify, rename, move, or delete anything under `work-files/`.
- Do not implement admin UI, public API, frontend, image processing, auth flow, enquiry endpoints, SEO generation, or business workflow services in this phase.
- Do not use DB `ENUM` types; use plain `string` columns + PHP backed enums for casts instead.
- Do not use floating point for money; use `DECIMAL(12,2)`.
- `width_cm`/`height_cm` on artworks are mandatory `DECIMAL(8,2)`, never nullable.
- `inventory_code` on artworks must be globally unique.
- No blind `cascadeOnDelete()` on core/historical relationships (see Architecture above).
- Translation tables: composite parent+locale identity unique constraint, plus `(slug, locale)` unique where the entity is localized-sluggable (artists, artworks, exhibitions, articles, pages).
- Do not seed fake gallery content (artists/artworks/exhibitions); seed only `roles` and `enquiry_subjects` (fixed vocabulary from requirements: buy / artist-submission / other).
- Do not commit or push — this session's instructions are explicit that git actions happen only when separately requested.
- Every migration needs valid `up()`/`down()`; run in dependency-safe order (no FK to a not-yet-created table).

### Resolved spec ambiguities (documented per spec's own "document, don't invent" rule)

1. **`artist_translations.slug`**: Section 2's field list omits `slug`, but Section 1 explicitly mandates localized slugs "for: artists, artworks, exhibitions, articles, pages." Section 1 is the general, unambiguous rule — `slug` is added to `artist_translations` with `unique(artist_id, locale)` and `unique(slug, locale)`, matching every other translated+sluggable entity.
2. **`seo_metadata.title` / `description` nullable**: Not marked nullable in Phase 02's field list, but `backend-requirements-en.md` §7 explicitly states "If left empty, generated automatically" — the primary source of truth requires emptiness to be representable. Both columns are nullable.
3. **`exhibitions.end_date` kept `NOT NULL`** per the literal spec, even though real "upcoming"/open-ended exhibitions may not have a known end date yet. **Flagged as a Phase 03 recommendation**, not silently changed.
4. **`artwork_translations.short_description` / `provenance` kept `NOT NULL`** per the literal spec (unmarked fields are mandatory throughout the doc). **Flagged as a Phase 03 recommendation** if empty values turn out to be legitimate.
5. **`articles.status` / `.type` vocab and `published_at` nullability**: the spec leaves these value sets undefined ("use controlled application-level values ... instead of DB ENUM"). Chosen: `type` = `interview|video_project|art_article|exhibition_review|news|announcement` (matches requirements §"editorial" prose); `status` = `draft|published`; `published_at` nullable (a draft has none — internally consistent, not overriding any explicit spec value).
6. **`exhibitions.type` overlap with `articles.type`**: Phase 02 §6 still lists `exhibition|news|announcement` as `exhibitions.type` values even though it also recommends a separate `Article` model for editorial content. Implemented literally as specified (both fields exist, values as given). **Flagged as a Phase 03 question**: should `exhibitions.type` be trimmed to just `exhibition` now that `articles` covers news/announcements?
7. **Unmarked-nullable convention**: every field not explicitly annotated "(nullable)" in the spec is implemented `NOT NULL`. This affects e.g. `artworks.year_created`, `artworks.price`, `artworks.certificate`.

## Enums (`app/Enums/`)

`Locale` (az, en) · `MediaType` (image, video) · `ArtworkAvailability` (available, reserved, sold) · `ArtworkImageType` (main, detail, frame, wall) · `ExhibitionType` (exhibition, news, announcement) · `ExhibitionStatus` (current, past, upcoming) · `ExhibitionMediaType` (photo, video) · `ArticleType` (interview, video_project, art_article, exhibition_review, news, announcement) · `ArticleStatus` (draft, published) · `EnquiryStatus` (new, read, replied, closed).

All are `string`-backed PHP enums, cast via Eloquent's native enum casting (`casts()` method, matching the existing `User` model convention). Models use `#[Fillable([...])]` attributes like `App\Models\User` already does (Laravel 13 convention in this codebase) rather than a `protected $fillable` property.

---

### Task 1: Media system

**Files:**
- Create: `database/migrations/2026_09_16_000001_create_media_table.php`
- Create: `database/migrations/2026_09_16_000002_create_media_translations_table.php`
- Create: `database/migrations/2026_09_16_000003_create_media_variants_table.php`
- Create: `app/Enums/MediaType.php`, `app/Enums/Locale.php`
- Create: `app/Models/Media.php`, `app/Models/MediaTranslation.php`, `app/Models/MediaVariant.php`
- Test: `tests/Feature/Schema/MediaSchemaTest.php`

**Interfaces:**
- Produces: `media` table (soft-deletable), `media.id` referenced by every later `*_id -> media` FK (`restrictOnDelete()`); `Media` model with `translations()` hasMany, `variants()` hasMany, `type` cast to `MediaType`.

- [x] **Step 1: Write `media` migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('disk');
            $table->string('path');
            $table->string('original_filename');
            $table->string('mime_type');
            $table->unsignedBigInteger('size_bytes');
            $table->unsignedInteger('original_width');
            $table->unsignedInteger('original_height');
            $table->decimal('aspect_ratio', 10, 6);
            $table->softDeletes();
            $table->timestamps();

            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
```

- [x] **Step 2: Write `media_translations` migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('media_id')->constrained()->cascadeOnDelete();
            $table->string('locale', 5);
            $table->string('alt_text')->nullable();
            $table->timestamps();

            $table->unique(['media_id', 'locale']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_translations');
    }
};
```

- [x] **Step 3: Write `media_variants` migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('media_id')->constrained()->cascadeOnDelete();
            $table->string('variant');
            $table->string('disk');
            $table->string('path');
            $table->string('mime_type');
            $table->unsignedBigInteger('size_bytes');
            $table->unsignedInteger('width');
            $table->unsignedInteger('height');
            $table->timestamps();

            $table->unique(['media_id', 'variant']);
            $table->index('variant');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_variants');
    }
};
```

- [x] **Step 4: Write `Locale` and `MediaType` enums**

```php
<?php

namespace App\Enums;

enum Locale: string
{
    case Az = 'az';
    case En = 'en';
}
```

```php
<?php

namespace App\Enums;

enum MediaType: string
{
    case Image = 'image';
    case Video = 'video';
}
```

- [x] **Step 5: Write `Media`, `MediaTranslation`, `MediaVariant` models**

```php
<?php

namespace App\Models;

use App\Enums\MediaType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['type', 'disk', 'path', 'original_filename', 'mime_type', 'size_bytes', 'original_width', 'original_height', 'aspect_ratio'])]
class Media extends Model
{
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => MediaType::class,
            'size_bytes' => 'integer',
            'original_width' => 'integer',
            'original_height' => 'integer',
            'aspect_ratio' => 'decimal:6',
        ];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(MediaTranslation::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(MediaVariant::class);
    }
}
```

```php
<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['media_id', 'locale', 'alt_text'])]
class MediaTranslation extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['media_id', 'variant', 'disk', 'path', 'mime_type', 'size_bytes', 'width', 'height'])]
class MediaVariant extends Model
{
    protected function casts(): array
    {
        return ['size_bytes' => 'integer', 'width' => 'integer', 'height' => 'integer'];
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
```

- [x] **Step 6: Write the schema test**

```php
<?php

use App\Models\Media;
use App\Models\MediaTranslation;
use App\Models\MediaVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates media with translations and variants', function () {
    $media = Media::create([
        'type' => 'image', 'disk' => 'public', 'path' => 'x.jpg',
        'original_filename' => 'x.jpg', 'mime_type' => 'image/jpeg',
        'size_bytes' => 1000, 'original_width' => 800, 'original_height' => 600,
        'aspect_ratio' => 1.333333,
    ]);

    MediaTranslation::create(['media_id' => $media->id, 'locale' => 'az', 'alt_text' => 'test']);
    MediaVariant::create([
        'media_id' => $media->id, 'variant' => 'thumbnail', 'disk' => 'public',
        'path' => 'x-thumb.jpg', 'mime_type' => 'image/jpeg', 'size_bytes' => 100,
        'width' => 200, 'height' => 150,
    ]);

    expect($media->translations)->toHaveCount(1)
        ->and($media->variants)->toHaveCount(1);
});

it('enforces unique media_id+locale on translations', function () {
    $media = Media::create([
        'type' => 'image', 'disk' => 'public', 'path' => 'x.jpg',
        'original_filename' => 'x.jpg', 'mime_type' => 'image/jpeg',
        'size_bytes' => 1000, 'original_width' => 800, 'original_height' => 600,
        'aspect_ratio' => 1.333333,
    ]);
    MediaTranslation::create(['media_id' => $media->id, 'locale' => 'az', 'alt_text' => 'a']);

    MediaTranslation::create(['media_id' => $media->id, 'locale' => 'az', 'alt_text' => 'b']);
})->throws(\Illuminate\Database\QueryException::class);

it('soft deletes media', function () {
    $media = Media::create([
        'type' => 'image', 'disk' => 'public', 'path' => 'x.jpg',
        'original_filename' => 'x.jpg', 'mime_type' => 'image/jpeg',
        'size_bytes' => 1000, 'original_width' => 800, 'original_height' => 600,
        'aspect_ratio' => 1.333333,
    ]);
    $media->delete();

    expect(Media::count())->toBe(0)
        ->and(Media::withTrashed()->count())->toBe(1);
});
```

- [x] **Step 7: Run migrations and the test**

Run: `docker compose exec app php artisan migrate`
Run: `docker compose exec app php artisan test --filter=MediaSchemaTest`
Expected: migration applies cleanly; all 3 tests PASS.

---

### Task 2: Roles & user_roles

**Files:**
- Create: `database/migrations/2026_09_16_000004_create_roles_table.php`
- Create: `database/migrations/2026_09_16_000005_create_user_roles_table.php`
- Create: `app/Models/Role.php`
- Modify: `app/Models/User.php` (add `roles(): BelongsToMany`)
- Test: `tests/Feature/Schema/RoleSchemaTest.php`

**Interfaces:**
- Consumes: `users` table (already exists from Phase 01).
- Produces: `Role` model; `User::roles()`.

- [x] **Step 1: Write `roles` migration**

```php
Schema::create('roles', function (Blueprint $table) {
    $table->id();
    $table->string('name')->unique();
    $table->timestamps();
});
```

- [x] **Step 2: Write `user_roles` migration**

```php
Schema::create('user_roles', function (Blueprint $table) {
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('role_id')->constrained()->cascadeOnDelete();
    $table->primary(['user_id', 'role_id']);
});
```

- [x] **Step 3: Write `Role` model with `users(): BelongsToMany`, add `roles(): BelongsToMany` to `User`** (via `user_roles` pivot, no pivot timestamps).

- [x] **Step 4: Write test** asserting a user can be attached to a role and `$user->roles` returns it; attaching the same pair twice is prevented by the composite primary key.

- [x] **Step 5: Run migration + test.**

Run: `docker compose exec app php artisan migrate && docker compose exec app php artisan test --filter=RoleSchemaTest`

---

### Task 3: Managed catalog lists — mediums, genres, price_ranges

**Files:**
- Create: `database/migrations/2026_09_16_000006_create_mediums_table.php`
- Create: `database/migrations/2026_09_16_000007_create_medium_translations_table.php`
- Create: `database/migrations/2026_09_16_000008_create_genres_table.php`
- Create: `database/migrations/2026_09_16_000009_create_genre_translations_table.php`
- Create: `database/migrations/2026_09_16_000010_create_price_ranges_table.php`
- Create: `database/migrations/2026_09_16_000011_create_price_range_translations_table.php`
- Create: `app/Models/Medium.php`, `app/Models/MediumTranslation.php`, `app/Models/Genre.php`, `app/Models/GenreTranslation.php`, `app/Models/PriceRange.php`, `app/Models/PriceRangeTranslation.php`
- Test: `tests/Feature/Schema/CatalogListsSchemaTest.php`

**Interfaces:**
- Produces: `mediums`, `genres` tables consumed by Task 5 (`artworks.medium_id`/`genre_id`, `restrictOnDelete()`).

- [x] **Step 1:** `mediums`/`genres`: `id, slug unique, sort_order unsignedInteger default 0, is_active boolean default true, timestamps`.
- [x] **Step 2:** `medium_translations`/`genre_translations`: `id, {parent}_id FK cascade, locale, name, timestamps`, `unique({parent}_id, locale)`.
- [x] **Step 3:** `price_ranges`: `id, min_price decimal(12,2), max_price decimal(12,2) nullable, sort_order, is_active, timestamps`.
- [x] **Step 4:** `price_range_translations`: `id, price_range_id FK cascade, locale, name, timestamps`, `unique(price_range_id, locale)`.
- [x] **Step 5:** Models: each parent `hasMany` translations, `Locale` cast on translation rows, `#[Fillable]` matching columns.
- [x] **Step 6:** Test: create each pair, assert translation uniqueness constraint via `->throws(QueryException::class)` on duplicate `(parent_id, locale)`.
- [x] **Step 7:** Run: `docker compose exec app php artisan migrate && docker compose exec app php artisan test --filter=CatalogListsSchemaTest`

---

### Task 4: Artists (incl. exhibitions/awards sub-records)

**Files:**
- Create: `database/migrations/2026_09_16_000012_create_artists_table.php`
- Create: `database/migrations/2026_09_16_000013_create_artist_translations_table.php`
- Create: `database/migrations/2026_09_16_000014_create_artist_exhibitions_table.php`
- Create: `database/migrations/2026_09_16_000015_create_artist_exhibition_translations_table.php`
- Create: `database/migrations/2026_09_16_000016_create_artist_awards_table.php`
- Create: `database/migrations/2026_09_16_000017_create_artist_award_translations_table.php`
- Create: `app/Models/Artist.php`, `ArtistTranslation.php`, `ArtistExhibition.php`, `ArtistExhibitionTranslation.php`, `ArtistAward.php`, `ArtistAwardTranslation.php`
- Test: `tests/Feature/Schema/ArtistSchemaTest.php`

**Interfaces:**
- Consumes: `media.id` (Task 1) for `artists.representation_image_id` (`restrictOnDelete()`, nullable).
- Produces: `artists` table consumed by Task 5 (`artworks.artist_id`, `restrictOnDelete()`) and Task 6 (`exhibition_artists.artist_id`).

- [x] **Step 1:** `artists`: `id, representation_image_id FK->media nullable restrictOnDelete, birth_year unsignedSmallInteger nullable, sort_order unsignedInteger default 0, is_active boolean default true, softDeletes, timestamps`. Indexes: `is_active`, `sort_order`.
- [x] **Step 2:** `artist_translations`: `id, artist_id FK cascade, locale, slug, first_name, last_name, birth_place nullable, direction nullable, biography longText nullable, artistic_approach longText nullable, timestamps`. `unique(artist_id, locale)`, `unique(slug, locale)`. *(slug added per resolved ambiguity #1 above.)*
- [x] **Step 3:** `artist_exhibitions`: `id, artist_id FK cascade, year unsignedSmallInteger, sort_order unsignedInteger default 0, timestamps`.
- [x] **Step 4:** `artist_exhibition_translations`: `id, artist_exhibition_id FK cascade, locale, title, venue, timestamps`. `unique(artist_exhibition_id, locale)`.
- [x] **Step 5:** `artist_awards`: `id, artist_id FK cascade, year unsignedSmallInteger, sort_order unsignedInteger default 0, timestamps`.
- [x] **Step 6:** `artist_award_translations`: `id, artist_award_id FK cascade, locale, title, timestamps`. `unique(artist_award_id, locale)`.
- [x] **Step 7:** Models with relationships: `Artist::translations()`, `::exhibitions()` (hasMany `ArtistExhibition`), `::awards()` (hasMany `ArtistAward`), `::representationImage()` (belongsTo `Media`), `SoftDeletes`. `ArtistExhibition::translations()`, `::artist()`. Same shape for `ArtistAward`.
- [x] **Step 8:** Tests: unique `(artist_id, locale)` on `artist_translations`; unique `(slug, locale)` across two different artists sharing a slug in the same locale fails; artist soft-delete keeps row (`withTrashed`); creating an `ArtistExhibition` + its translation works and is reachable via `$artist->exhibitions`.
- [x] **Step 9:** Run: `docker compose exec app php artisan migrate && docker compose exec app php artisan test --filter=ArtistSchemaTest`

---

### Task 5: Artworks

**Files:**
- Create: `database/migrations/2026_09_16_000018_create_artworks_table.php`
- Create: `database/migrations/2026_09_16_000019_create_artwork_translations_table.php`
- Create: `database/migrations/2026_09_16_000020_create_artwork_images_table.php`
- Create: `app/Enums/ArtworkAvailability.php`, `app/Enums/ArtworkImageType.php`
- Create: `app/Models/Artwork.php`, `ArtworkTranslation.php`, `ArtworkImage.php`
- Test: `tests/Feature/Schema/ArtworkSchemaTest.php`

**Interfaces:**
- Consumes: `artists.id` (`restrictOnDelete()`), `mediums.id`/`genres.id` (`restrictOnDelete()`), `media.id` (`restrictOnDelete()`, via `artwork_images`).
- Produces: `artworks.id` consumed by Task 6 (`exhibition_artworks`) and Task 11 (`enquiries.artwork_id`).

- [x] **Step 1:** `artworks` migration — all columns per spec §4 (see plan header for the nullable/NOT-NULL convention): `artist_id` FK restrict, `medium_id`/`genre_id` FK restrict, `year_created` unsignedSmallInteger, `width_cm`/`height_cm` `decimal(8,2)` **NOT NULL**, `aspect_ratio` `decimal(10,6)`, `price` `decimal(12,2)`, `show_price` boolean default true, `availability` string default `'available'`, `year_sold` unsignedSmallInteger nullable, `inventory_code` string unique, `certificate` boolean default false, `frame_condition` text nullable, `delivery_note` text nullable, `featured` boolean default false, `show_on_wall` boolean default false, `sort_order` unsignedInteger default 0, `is_active` boolean default true, `softDeletes`, `timestamps`. Indexes: `availability`, `featured`, `show_on_wall`, `is_active`, `created_at`, `price`, `width_cm`, `height_cm` (`inventory_code` unique already indexes it).
- [x] **Step 2:** `artwork_translations`: `id, artwork_id FK cascade, locale, slug, title, short_description text, provenance text, timestamps`. `unique(artwork_id, locale)`, `unique(slug, locale)`.
- [x] **Step 3:** `artwork_images`: `id, artwork_id FK cascade, media_id FK->media restrict, type string, sort_order unsignedInteger default 0, is_main boolean default false, timestamps`. Index on `type`.
- [x] **Step 4:** `ArtworkAvailability` enum (`available|reserved|sold`), `ArtworkImageType` enum (`main|detail|frame|wall`).
- [x] **Step 5:** `Artwork` model: `belongsTo` Artist/Medium/Genre, `hasMany` translations/images/enquiries (enquiries relation added in Task 11 — leave the method out until then, or stub it now and confirm it in Task 11), casts: `availability` → enum, decimals → `decimal:2`/`decimal:6`, booleans. Compute `aspect_ratio` automatically from `width_cm`/`height_cm` in a `saving` model event so callers never have to pass it explicitly (still an overridable, explicitly-stored column, not a derived accessor — matches spec's "aspect_ratio must be stored").
- [x] **Step 6:** `ArtworkTranslation` (`belongsTo` Artwork), `ArtworkImage` (`belongsTo` Artwork, `belongsTo` Media, `type` cast to `ArtworkImageType`).
- [x] **Step 7:** Tests: `width_cm`/`height_cm` NULL rejected at DB level (`->throws(QueryException::class)`); duplicate `inventory_code` rejected; `price` accepts a fixed-point decimal like `12500.50` and round-trips exactly; `aspect_ratio` gets populated on save; artwork soft-delete works; creating an `ArtworkImage` linking to a `Media` row works.
- [x] **Step 8:** Run: `docker compose exec app php artisan migrate && docker compose exec app php artisan test --filter=ArtworkSchemaTest`

---

### Task 6: Exhibitions

**Files:**
- Create: `database/migrations/2026_09_16_000021_create_exhibitions_table.php`
- Create: `database/migrations/2026_09_16_000022_create_exhibition_translations_table.php`
- Create: `database/migrations/2026_09_16_000023_create_exhibition_artists_table.php`
- Create: `database/migrations/2026_09_16_000024_create_exhibition_artworks_table.php`
- Create: `database/migrations/2026_09_16_000025_create_exhibition_media_table.php`
- Create: `app/Enums/ExhibitionType.php`, `ExhibitionStatus.php`, `ExhibitionMediaType.php`
- Create: `app/Models/Exhibition.php`, `ExhibitionTranslation.php`, `ExhibitionMedium.php` (pivot-adjacent model for `exhibition_media`, named `ExhibitionMedium` to avoid clashing with the `Medium` model)
- Test: `tests/Feature/Schema/ExhibitionSchemaTest.php`

**Interfaces:**
- Consumes: `artists.id` (restrict), `artworks.id` (restrict), `media.id` (restrict).

- [x] **Step 1:** `exhibitions`: `id, type string, status string default 'upcoming', start_date date, end_date date, is_active boolean default true, softDeletes, timestamps`. Indexes: `status`, `start_date`, `end_date`, `is_active`.
- [x] **Step 2:** `exhibition_translations`: `id, exhibition_id FK cascade, locale, slug, title, venue, short_text text, full_text longText, timestamps`. `unique(exhibition_id, locale)`, `unique(slug, locale)`.
- [x] **Step 3:** `exhibition_artists`: `exhibition_id FK->exhibitions cascade, artist_id FK->artists restrict, sort_order unsignedInteger default 0`, primary key `(exhibition_id, artist_id)`, no timestamps.
- [x] **Step 4:** `exhibition_artworks`: `exhibition_id FK->exhibitions cascade, artwork_id FK->artworks restrict, sort_order unsignedInteger default 0`, primary key `(exhibition_id, artwork_id)`, no timestamps.
- [x] **Step 5:** `exhibition_media`: `id, exhibition_id FK cascade, media_id FK->media restrict, type string, sort_order unsignedInteger default 0, timestamps`.
- [x] **Step 6:** Enums `ExhibitionType` (`exhibition|news|announcement`), `ExhibitionStatus` (`current|past|upcoming`), `ExhibitionMediaType` (`photo|video`).
- [x] **Step 7:** `Exhibition` model: `hasMany` translations, `belongsToMany` Artist (via `exhibition_artists`, `withPivot('sort_order')`), `belongsToMany` Artwork (via `exhibition_artworks`, `withPivot('sort_order')`), `hasMany` `ExhibitionMedium` (rename relation method `media()`), `SoftDeletes`, casts for `type`/`status` enums and dates.
- [x] **Step 8:** Add `Artist::exhibitionAppearances(): BelongsToMany` and `Artwork::exhibitions(): BelongsToMany` (inverse side) so both directions are navigable.
- [x] **Step 9:** Tests: attaching artists/artworks to an exhibition works and is queryable both directions; deleting an artwork that's linked to an exhibition is blocked (restrict) — assert `QueryException`; deleting the exhibition cascades its own pivot rows away without touching the artist/artwork rows themselves.
- [x] **Step 10:** Run: `docker compose exec app php artisan migrate && docker compose exec app php artisan test --filter=ExhibitionSchemaTest`

---

### Task 7: Editorial articles

**Files:**
- Create: `database/migrations/2026_09_16_000026_create_articles_table.php`
- Create: `database/migrations/2026_09_16_000027_create_article_translations_table.php`
- Create: `app/Enums/ArticleType.php`, `ArticleStatus.php`
- Create: `app/Models/Article.php`, `ArticleTranslation.php`
- Test: `tests/Feature/Schema/ArticleSchemaTest.php`

- [x] **Step 1:** `articles`: `id, type string, status string default 'draft', published_at timestamp nullable` *(resolved ambiguity #5)*`, is_active boolean default true, softDeletes, timestamps`. Indexes: `type`, `status`, `published_at`, `is_active`.
- [x] **Step 2:** `article_translations`: `id, article_id FK cascade, locale, slug, title, short_text text, content longText, timestamps`. `unique(article_id, locale)`, `unique(slug, locale)`.
- [x] **Step 3:** `ArticleType` (`interview|video_project|art_article|exhibition_review|news|announcement`), `ArticleStatus` (`draft|published`).
- [x] **Step 4:** `Article` model: `hasMany` translations, `SoftDeletes`, enum casts. `ArticleTranslation belongsTo Article`.
- [x] **Step 5:** Tests: unique slug-per-locale enforced; `published_at` nullable for a draft; soft delete works.
- [x] **Step 6:** Run: `docker compose exec app php artisan migrate && docker compose exec app php artisan test --filter=ArticleSchemaTest`

---

### Task 8: Pages, sections, FAQs

**Files:**
- Create: `database/migrations/2026_09_16_000028_create_pages_table.php`
- Create: `database/migrations/2026_09_16_000029_create_page_translations_table.php`
- Create: `database/migrations/2026_09_16_000030_create_page_sections_table.php`
- Create: `database/migrations/2026_09_16_000031_create_page_section_translations_table.php`
- Create: `database/migrations/2026_09_16_000032_create_faqs_table.php`
- Create: `database/migrations/2026_09_16_000033_create_faq_translations_table.php`
- Create: `app/Models/Page.php`, `PageTranslation.php`, `PageSection.php`, `PageSectionTranslation.php`, `Faq.php`, `FaqTranslation.php`
- Test: `tests/Feature/Schema/PageSchemaTest.php`

- [x] **Step 1:** `pages`: `id, type string, is_active boolean default true, timestamps` (no soft deletes — not in spec §14's list).
- [x] **Step 2:** `page_translations`: `id, page_id FK cascade, locale, slug, title, content longText, timestamps`. `unique(page_id, locale)`, `unique(slug, locale)`.
- [x] **Step 3:** `page_sections`: `id, page_id FK cascade, key string, sort_order unsignedInteger default 0, is_active boolean default true, timestamps`. `unique(page_id, key)` (added for integrity; not a spec conflict — a page having two sections with the same key would be a data bug).
- [x] **Step 4:** `page_section_translations`: `id, page_section_id FK cascade, locale, heading, body longText, timestamps`. `unique(page_section_id, locale)`.
- [x] **Step 5:** `faqs`: `id, page_id FK->pages cascade, sort_order unsignedInteger default 0, is_active boolean default true, timestamps`.
- [x] **Step 6:** `faq_translations`: `id, faq_id FK cascade, locale, question, answer text, timestamps`. `unique(faq_id, locale)`.
- [x] **Step 7:** Models: `Page hasMany` translations/sections/faqs; `PageSection hasMany` translations, `belongsTo` Page; `Faq belongsTo` Page, `hasMany` translations.
- [x] **Step 8:** Tests: page with sections and FAQs creates/queries correctly; duplicate `(page_id, key)` on sections rejected; duplicate `(page_id, locale)` slug rejected.
- [x] **Step 9:** Run: `docker compose exec app php artisan migrate && docker compose exec app php artisan test --filter=PageSchemaTest`

---

### Task 9: Site settings & social links

**Files:**
- Create: `database/migrations/2026_09_16_000034_create_site_settings_table.php`
- Create: `database/migrations/2026_09_16_000035_create_social_links_table.php`
- Create: `app/Models/SiteSetting.php`, `SocialLink.php`
- Test: `tests/Feature/Schema/SiteSettingSchemaTest.php`

- [x] **Step 1:** `site_settings`: `id, key string unique, value text default '', type string, timestamps`.
- [x] **Step 2:** `social_links`: `id, platform string, url string, sort_order unsignedInteger default 0, is_active boolean default true, timestamps`.
- [x] **Step 3:** Plain models, no relationships needed.
- [x] **Step 4:** Test: duplicate `key` on `site_settings` rejected.
- [x] **Step 5:** Run: `docker compose exec app php artisan migrate && docker compose exec app php artisan test --filter=SiteSettingSchemaTest`

---

### Task 10: SEO metadata

**Files:**
- Create: `database/migrations/2026_09_16_000036_create_seo_metadata_table.php`
- Create: `app/Models/SeoMetadata.php`
- Test: `tests/Feature/Schema/SeoMetadataSchemaTest.php`

**Interfaces:**
- Consumes: `media.id` (restrict, nullable, for `og_image_id`).

- [x] **Step 1:** `seo_metadata`: `id, seoable_type string, seoable_id unsignedBigInteger, locale string(5), title string nullable` *(resolved ambiguity #2)*`, description text nullable, og_image_id FK->media nullable restrict, timestamps`. `unique(seoable_type, seoable_id, locale)`. Index `(seoable_type, seoable_id)`.
- [x] **Step 2:** `SeoMetadata` model with `morphTo('seoable')` and `belongsTo(Media::class, 'og_image_id')`.
- [x] **Step 3:** Test: attach SEO metadata to an `Artwork` via the morph relation; duplicate `(seoable_type, seoable_id, locale)` rejected; `title`/`description` can be left null.
- [x] **Step 4:** Run: `docker compose exec app php artisan migrate && docker compose exec app php artisan test --filter=SeoMetadataSchemaTest`

---

### Task 11: Enquiry system

**Files:**
- Create: `database/migrations/2026_09_16_000037_create_enquiry_subjects_table.php`
- Create: `database/migrations/2026_09_16_000038_create_enquiry_subject_translations_table.php`
- Create: `database/migrations/2026_09_16_000039_create_enquiries_table.php`
- Create: `app/Enums/EnquiryStatus.php`
- Create: `app/Models/EnquirySubject.php`, `EnquirySubjectTranslation.php`, `Enquiry.php`
- Modify: `app/Models/Artwork.php` (add `enquiries(): HasMany`, completing the stub from Task 5)
- Test: `tests/Feature/Schema/EnquirySchemaTest.php`

**Interfaces:**
- Consumes: `artworks.id` (restrict, nullable).

- [x] **Step 1:** `enquiry_subjects`: `id, key string unique, sort_order unsignedInteger default 0, is_active boolean default true, timestamps`.
- [x] **Step 2:** `enquiry_subject_translations`: `id, enquiry_subject_id FK cascade, locale, name, timestamps`. `unique(enquiry_subject_id, locale)`.
- [x] **Step 3:** `enquiries`: `id, enquiry_subject_id FK->enquiry_subjects restrict, artwork_id FK->artworks nullable restrict, inventory_code string nullable, submitted_at timestamp, name string, contact string, message text, status string default 'new', internal_note text nullable, ip_address string(45) nullable, user_agent text nullable, timestamps`. Indexes: `status`, `created_at`, `submitted_at`, `artwork_id`.
- [x] **Step 4:** `EnquiryStatus` enum (`new|read|replied|closed`).
- [x] **Step 5:** Models: `EnquirySubject hasMany` translations and `hasMany` Enquiry; `Enquiry belongsTo` EnquirySubject and Artwork, `status` cast to enum, `submitted_at` cast to datetime. Add `Artwork::enquiries(): HasMany`.
- [x] **Step 6:** Tests: creating an enquiry against an artwork works and `$artwork->enquiries` returns it; deleting an artwork that has enquiries is blocked (restrict) — assert `QueryException`; `inventory_code` on the enquiry is independent storage (changing/deleting isn't required for this test, just assert the column accepts a value distinct from the artwork's current one, proving it's a snapshot, not a live lookup).
- [x] **Step 7:** Run: `docker compose exec app php artisan migrate && docker compose exec app php artisan test --filter=EnquirySchemaTest`

---

### Task 12: Seeders

**Files:**
- Create: `database/seeders/RoleSeeder.php`
- Create: `database/seeders/EnquirySubjectSeeder.php`
- Modify: `database/seeders/DatabaseSeeder.php` (call both)
- Test: `tests/Feature/Schema/SeederTest.php`

- [x] **Step 1:** `RoleSeeder` creates exactly `administrator` and `editor` (`updateOrCreate` by `name`, idempotent).
- [x] **Step 2:** `EnquirySubjectSeeder` creates the three fixed subjects from `backend-requirements-en.md` §1.6 (`buy`, `artist_submission`, `other`) each with `az`/`en` translations (`updateOrCreate` by `key`, idempotent).
- [x] **Step 3:** Wire both into `DatabaseSeeder::run()`.
- [x] **Step 4:** Test: running the seeders twice doesn't create duplicates; `Role::count() === 2`; `EnquirySubject::count() === 3` with both locale translations present.
- [x] **Step 5:** Run: `docker compose exec app php artisan db:seed && docker compose exec app php artisan test --filter=SeederTest`

---

### Task 13: Full verification pass

**Files:** none created; this task only runs commands and inspects output.

- [x] **Step 1:** Format: `docker compose exec app ./vendor/bin/pint` — expect no unstaged formatting diffs after (or apply and note it).
- [x] **Step 2:** Full test suite: `docker compose exec app php artisan test` — expect all tests (Phase 01's + all schema tests above) PASS.
- [x] **Step 3:** Clean-database migration cycle against the real MySQL container:
  - `docker compose exec app php artisan migrate:fresh` — expect success, no errors.
  - `docker compose exec app php artisan migrate:rollback` — expect the most recent batch to roll back cleanly.
  - `docker compose exec app php artisan migrate` — expect it to reapply cleanly.
- [x] **Step 4:** Inspect the resulting MySQL schema for the expected FKs/indexes/uniques, e.g.:
  `docker compose exec app php artisan db:show --json` or targeted `SHOW CREATE TABLE` queries via `docker compose exec mysql mysql -u... -p... -e "SHOW CREATE TABLE artworks"` for a handful of the most FK-heavy tables (`artworks`, `artist_translations`, `exhibition_artists`, `seo_metadata`).
- [x] **Step 5:** `git status` / `git diff --stat` — confirm only the expected new/modified files appear, nothing under `work-files/` shows as modified, and `.gitignore` still excludes it.
- [x] **Step 6:** Do not commit or push (per explicit instruction for this task).

---

## Self-review notes

- Spec coverage: every table in Phase 02 §§1–13 has a task; §14 (soft deletes) and §15 (FK behavior) are cross-cutting and applied per-table above rather than as a separate task; §16/§17 (types/indexing) likewise folded into each table's step; §18 (models) folded into each task; §19 (seeders) is Task 12; §20–22 (migration quality, tests, security review) is Task 13 plus the per-task tests.
- All ambiguity resolutions are called out explicitly rather than silently decided.
- No task leaves a placeholder — every step has literal column lists, migration/model code, or a fully specified test intent.

## Execution notes (found while implementing, not foreseeable at planning time)

- **Test syntax**: the plan's Step examples used Pest (`it(...)`, `uses(...)`), but this codebase runs plain PHPUnit (class-based `TestCase`, no Pest installed). Every actual test file uses PHPUnit conventions (`public function test_...(): void`, `$this->assertX`, `$this->expectException`) instead.
- **`Medium` model / `mediums` table**: Eloquent's default pluralization turns `Medium` into `media`, colliding with the actual `media` (image) table. Fixed with an explicit `protected $table = 'mediums';` on the model, and `->constrained('mediums')` on every `medium_id` foreign key (`medium_translations.medium_id`, `artworks.medium_id`) instead of relying on inference.
- **MySQL identifier length limit (64 chars)**: `artist_exhibition_translations`'s auto-named unique index on `(artist_exhibition_id, locale)` exceeded 64 characters. Fixed by passing an explicit short index name. A few other translation tables were given explicit unique-index names defensively even though they measured under the limit.
- **MySQL forbids a `DEFAULT` on `TEXT` columns** (unlike SQLite): `site_settings.value` was originally `text()->default('')`, which fails on MySQL 8.4 with "BLOB, TEXT, GEOMETRY or JSON column can't have a default value." Fixed by dropping the default; the application layer always supplies a value.
- All of the above were caught by actually running `php artisan migrate` against the real MySQL container per task, not just against SQLite — confirms the value of testing against both engines during this phase.
