<?php

namespace Database\Seeders;

use App\Enums\ExhibitionStatus;
use App\Models\Artist;
use App\Models\ArtistTranslation;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\ExhibitionTranslation;
use App\Models\Genre;
use App\Models\Medium;
use Illuminate\Database\Seeder;

/**
 * Sample gallery content for local development, demos and manual QA: 4 artists, 8 artworks and 2 exhibitions
 * (one current, one upcoming), in Azerbaijani and English.
 *
 * NOT part of DatabaseSeeder: it never runs with `db:seed` and never in production. Run it on purpose:
 *
 *     php artisan db:seed --class=DemoContentSeeder
 *
 * Every record is identifiable as demo content: slugs start with `demo-`, inventory codes are `DEMO-2026-NNN`, and
 * the descriptive texts start with a "[Demo]" marker. The seeder is idempotent: records are looked up by those keys
 * (slug / inventory code), so running it again creates nothing new and leaves admin edits to artists, artworks and
 * texts alone. (A demo record that was soft-deleted is restored.) The two exhibitions are the exception: their dates, status
 * and lists of artists/artworks are refreshed on every run so that one stays "current" and the other "upcoming".
 *
 * No images are created: the repository has no placeholder media to reference, and binary files are not added by a
 * seeder. Demo artworks therefore have no image (`image_url` is null and the public site shows its fallback);
 * upload real ones in the admin (Media) to see the full layout.
 *
 * Genres and mediums the demo artworks need are created only if their slug does not exist yet.
 */
class DemoContentSeeder extends Seeder
{
    private const GENRES = [
        'painting' => ['az' => 'Rəngkarlıq', 'en' => 'Painting'],
        'graphics' => ['az' => 'Qrafika', 'en' => 'Graphics'],
        'sculpture' => ['az' => 'Heykəltəraşlıq', 'en' => 'Sculpture'],
    ];

    private const MEDIUMS = [
        'oil-on-canvas' => ['az' => 'Kətan üzərində yağlı boya', 'en' => 'Oil on canvas'],
        'watercolor' => ['az' => 'Akvarel', 'en' => 'Watercolor'],
        'bronze' => ['az' => 'Bürünc', 'en' => 'Bronze'],
    ];

    private const ARTISTS = [
        [
            'slug' => ['az' => 'demo-nermin-numune', 'en' => 'demo-nermin-sample'],
            'first_name' => ['az' => 'Nərmin', 'en' => 'Nermin'],
            'last_name' => ['az' => 'Nümunə', 'en' => 'Sample'],
            'birth_year' => 1984,
            'birth_place' => ['az' => 'Bakı', 'en' => 'Baku'],
            'direction' => ['az' => 'Müasir rəngkarlıq', 'en' => 'Contemporary painting'],
        ],
        [
            'slug' => ['az' => 'demo-elvin-sinaq', 'en' => 'demo-elvin-trial'],
            'first_name' => ['az' => 'Elvin', 'en' => 'Elvin'],
            'last_name' => ['az' => 'Sınaq', 'en' => 'Trial'],
            'birth_year' => 1979,
            'birth_place' => ['az' => 'Gəncə', 'en' => 'Ganja'],
            'direction' => ['az' => 'Qrafika və akvarel', 'en' => 'Graphics and watercolor'],
        ],
        [
            'slug' => ['az' => 'demo-leyla-ornek', 'en' => 'demo-leyla-example'],
            'first_name' => ['az' => 'Leyla', 'en' => 'Leyla'],
            'last_name' => ['az' => 'Örnək', 'en' => 'Example'],
            'birth_year' => 1991,
            'birth_place' => ['az' => 'Şəki', 'en' => 'Sheki'],
            'direction' => ['az' => 'Heykəltəraşlıq', 'en' => 'Sculpture'],
        ],
        [
            'slug' => ['az' => 'demo-resad-demo', 'en' => 'demo-rashad-demo'],
            'first_name' => ['az' => 'Rəşad', 'en' => 'Rashad'],
            'last_name' => ['az' => 'Demo', 'en' => 'Demo'],
            'birth_year' => 1988,
            'birth_place' => ['az' => 'Sumqayıt', 'en' => 'Sumgait'],
            'direction' => ['az' => 'Abstrakt sənət', 'en' => 'Abstract art'],
        ],
    ];

    /** artist index, genre, medium, size, price, availability, flags */
    private const ARTWORKS = [
        ['artist' => 0, 'genre' => 'painting', 'medium' => 'oil-on-canvas', 'w' => 80, 'h' => 60, 'price' => 1800, 'availability' => 'available', 'featured' => true, 'wall' => true, 'show_price' => true, 'year' => 2023,
            'az' => 'Səhər işığı', 'en' => 'Morning Light'],
        ['artist' => 0, 'genre' => 'painting', 'medium' => 'oil-on-canvas', 'w' => 100, 'h' => 100, 'price' => 3200, 'availability' => 'reserved', 'featured' => false, 'wall' => true, 'show_price' => true, 'year' => 2024,
            'az' => 'Xəzər sahili', 'en' => 'Caspian Shore'],
        ['artist' => 1, 'genre' => 'graphics', 'medium' => 'watercolor', 'w' => 40, 'h' => 30, 'price' => 650, 'availability' => 'available', 'featured' => true, 'wall' => true, 'show_price' => true, 'year' => 2022,
            'az' => 'İçərişəhər eskizi', 'en' => 'Old City Sketch'],
        ['artist' => 1, 'genre' => 'graphics', 'medium' => 'watercolor', 'w' => 50, 'h' => 70, 'price' => 900, 'availability' => 'available', 'featured' => false, 'wall' => true, 'show_price' => false, 'year' => 2024,
            'az' => 'Payız yağışı', 'en' => 'Autumn Rain'],
        ['artist' => 2, 'genre' => 'sculpture', 'medium' => 'bronze', 'w' => 30, 'h' => 55, 'price' => 4200, 'availability' => 'available', 'featured' => true, 'wall' => false, 'show_price' => true, 'year' => 2021,
            'az' => 'Dayanan fiqur', 'en' => 'Standing Figure'],
        ['artist' => 2, 'genre' => 'sculpture', 'medium' => 'bronze', 'w' => 25, 'h' => 25, 'price' => 2700, 'availability' => 'sold', 'featured' => false, 'wall' => false, 'show_price' => true, 'year' => 2020, 'year_sold' => 2025,
            'az' => 'Kiçik etüd', 'en' => 'Small Study'],
        ['artist' => 3, 'genre' => 'painting', 'medium' => 'oil-on-canvas', 'w' => 120, 'h' => 90, 'price' => 5400, 'availability' => 'available', 'featured' => false, 'wall' => true, 'show_price' => true, 'year' => 2025,
            'az' => 'Rəng ritmi', 'en' => 'Rhythm of Color'],
        ['artist' => 3, 'genre' => 'painting', 'medium' => 'oil-on-canvas', 'w' => 70, 'h' => 70, 'price' => 2100, 'availability' => 'available', 'featured' => false, 'wall' => true, 'show_price' => true, 'year' => 2025,
            'az' => 'Sükut', 'en' => 'Stillness'],
    ];

    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command?->error('DemoContentSeeder refuses to run in production: it adds sample content.');

            return;
        }

        $genres = collect(self::GENRES)->map(fn ($names, $slug) => $this->catalogTerm(Genre::class, $slug, $names));
        $mediums = collect(self::MEDIUMS)->map(fn ($names, $slug) => $this->catalogTerm(Medium::class, $slug, $names));

        $artists = [];
        foreach (self::ARTISTS as $index => $data) {
            $artists[$index] = $this->artist($index, $data);
        }

        $artworks = [];
        foreach (self::ARTWORKS as $index => $data) {
            $artworks[$index] = $this->artwork($index, $data, $artists[$data['artist']], $genres[$data['genre']], $mediums[$data['medium']]);
        }

        $this->exhibition(ExhibitionStatus::Current, now()->subWeeks(2), now()->addWeeks(6), [0, 1], [0, 1, 2, 3], [
            'slug' => ['az' => 'demo-cari-serge', 'en' => 'demo-current-exhibition'],
            'title' => ['az' => 'Nümunə sərgi: Şəhər və işıq', 'en' => 'Sample exhibition: City and Light'],
        ], $artists, $artworks);

        $this->exhibition(ExhibitionStatus::Upcoming, now()->addWeeks(4), now()->addWeeks(10), [2, 3], [4, 5, 6, 7], [
            'slug' => ['az' => 'demo-gelecek-serge', 'en' => 'demo-upcoming-exhibition'],
            'title' => ['az' => 'Nümunə sərgi: Forma və rəng', 'en' => 'Sample exhibition: Form and Color'],
        ], $artists, $artworks);

        $this->command?->info('Demo content ready: 4 artists, 8 artworks, 2 exhibitions (no images; see the seeder notes).');
    }

    private function catalogTerm(string $model, string $slug, array $names): Genre|Medium
    {
        $term = $model::query()->firstOrCreate(['slug' => $slug], ['is_active' => true, 'sort_order' => (int) $model::query()->max('sort_order') + 1]);

        foreach ($names as $locale => $name) {
            $term->translations()->firstOrCreate(['locale' => $locale], ['name' => $name]);
        }

        return $term;
    }

    private function artist(int $index, array $data): Artist
    {
        $existing = ArtistTranslation::query()->where('slug', $data['slug']['az'])->where('locale', 'az')->first();
        $artist = $existing ? Artist::withTrashed()->findOrFail($existing->artist_id) : Artist::query()->create([
            'birth_year' => $data['birth_year'],
            'sort_order' => 900 + $index,
            'is_active' => true,
        ]);
        $artist->trashed() && $artist->restore();

        foreach (['az', 'en'] as $locale) {
            $artist->translations()->firstOrCreate(['locale' => $locale], [
                'slug' => $data['slug'][$locale],
                'first_name' => $data['first_name'][$locale],
                'last_name' => $data['last_name'][$locale],
                'birth_place' => $data['birth_place'][$locale],
                'direction' => $data['direction'][$locale],
                'biography' => $locale === 'az'
                    ? "[Demo] {$data['first_name']['az']} {$data['last_name']['az']} nümunə rəssamdır; bu mətn yalnız sınaq məqsədilə əlavə edilib."
                    : "[Demo] {$data['first_name']['en']} {$data['last_name']['en']} is a sample artist; this text exists for testing only.",
                'artistic_approach' => $locale === 'az' ? '[Demo] Nümunə yanaşma.' : '[Demo] Sample approach.',
            ]);
        }

        return $artist;
    }

    private function artwork(int $index, array $data, Artist $artist, Genre $genre, Medium $medium): Artwork
    {
        $number = str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
        $code = "DEMO-2026-{$number}";

        $artwork = Artwork::withTrashed()->firstOrCreate(['inventory_code' => $code], [
            'artist_id' => $artist->id,
            'genre_id' => $genre->id,
            'medium_id' => $medium->id,
            'year_created' => $data['year'],
            'width_cm' => $data['w'],
            'height_cm' => $data['h'],
            'price' => $data['price'],
            'show_price' => $data['show_price'],
            'availability' => $data['availability'],
            'year_sold' => $data['year_sold'] ?? null,
            'certificate' => true,
            'featured' => $data['featured'],
            'show_on_wall' => $data['wall'],
            'sort_order' => 900 + $index,
            'is_active' => true,
        ]);
        $artwork->trashed() && $artwork->restore();

        $texts = [
            'az' => ['slug' => "demo-eser-{$number}", 'title' => $data['az'], 'short_description' => "[Demo] {$data['az']} — nümunə əsər.", 'provenance' => '[Demo] Sınaq məqsədli nümunə məlumat.'],
            'en' => ['slug' => "demo-artwork-{$number}", 'title' => $data['en'], 'short_description' => "[Demo] {$data['en']} — a sample artwork.", 'provenance' => '[Demo] Sample data for testing.'],
        ];

        foreach ($texts as $locale => $values) {
            $artwork->translations()->firstOrCreate(['locale' => $locale], $values);
        }

        return $artwork;
    }

    private function exhibition(ExhibitionStatus $status, $start, $end, array $artistIndexes, array $artworkIndexes, array $texts, array $artists, array $artworks): void
    {
        $existing = ExhibitionTranslation::query()->where('slug', $texts['slug']['az'])->where('locale', 'az')->first();
        $exhibition = $existing ? Exhibition::withTrashed()->findOrFail($existing->exhibition_id) : new Exhibition;
        $exhibition->trashed() && $exhibition->restore();

        // Dates and status are refreshed each run so the "current" and "upcoming" demos stay that way.
        $exhibition->fill([
            'type' => 'exhibition',
            'status' => $status,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'is_active' => true,
        ])->save();

        foreach (['az', 'en'] as $locale) {
            $exhibition->translations()->firstOrCreate(['locale' => $locale], [
                'slug' => $texts['slug'][$locale],
                'title' => $texts['title'][$locale],
                'venue' => $locale === 'az' ? 'Nümunə qalereya, Bakı' : 'Sample gallery, Baku',
                'short_text' => $locale === 'az' ? '[Demo] Sınaq məqsədli nümunə sərgi.' : '[Demo] A sample exhibition for testing.',
                'full_text' => $locale === 'az'
                    ? '[Demo] Bu sərgi və içindəki əsərlər yalnız inkişaf və sınaq üçün əlavə edilmiş nümunə məzmundur.'
                    : '[Demo] This exhibition and its artworks are sample content added for development and testing only.',
            ]);
        }

        $exhibition->artists()->sync(collect($artistIndexes)->mapWithKeys(fn ($i, $order) => [$artists[$i]->id => ['sort_order' => $order]])->all());
        $exhibition->artworks()->sync(collect($artworkIndexes)->mapWithKeys(fn ($i, $order) => [$artworks[$i]->id => ['sort_order' => $order]])->all());
    }
}
