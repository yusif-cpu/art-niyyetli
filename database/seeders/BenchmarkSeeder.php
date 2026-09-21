<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Artist;
use App\Models\Exhibition;
use App\Models\Faq;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Page;
use App\Models\SiteSetting;
use App\Models\SocialLink;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Builds a realistic, relation-complete gallery dataset of a chosen size, for
 * measuring public-endpoint performance and for the N+1 regression test
 * (tests/Feature/Performance/PublicApiQueryCountTest.php).
 *
 * NOT registered in DatabaseSeeder — it never runs as part of a normal seed — and it
 * refuses to run outside the `local` and `testing` environments. Every call to
 * populate() is additive and uses a fresh random batch tag, so it can be called
 * repeatedly (the test calls it twice to compare a small and a larger dataset).
 *
 * Measuring against a SCRATCH database (never the dev MySQL):
 *
 *   docker exec art-niyyetli-app sh -c '
 *     export DB_CONNECTION=sqlite DB_DATABASE=/tmp/bench.sqlite DB_URL= BENCH_ARTWORKS=500
 *     touch /tmp/bench.sqlite
 *     php artisan migrate:fresh --force && php artisan db:seed --class=BenchmarkSeeder --force'
 *
 * SQLite is enough for timing, but query PLANS (EXPLAIN, index choices, filesorts) only mean something on MySQL. For
 * those, use a throwaway container on the compose network instead of the dev database — its data lives in tmpfs and
 * disappears with it (never point migrate:fresh at the dev MySQL):
 *
 *   docker run -d --name art-bench-mysql --network art-niyyetli_art-niyyetli --tmpfs /var/lib/mysql \
 *     -e MYSQL_ROOT_PASSWORD=bench -e MYSQL_DATABASE=bench mysql:8.4
 *   docker exec -e DB_CONNECTION=mysql -e DB_HOST=art-bench-mysql -e DB_DATABASE=bench -e DB_USERNAME=root \
 *     -e DB_PASSWORD=bench -e DB_URL= -e BENCH_ARTWORKS=5000 art-niyyetli-app sh -c \
 *     'php artisan migrate:fresh --force && php artisan db:seed --class=BenchmarkSeeder --force'
 *   docker rm -f art-bench-mysql
 *
 * Then time an endpoint in-process, with the query log, as the Phase 12 audit did:
 *
 *   DB::enableQueryLog();
 *   $t = microtime(true);
 *   $response = app()->handle(Illuminate\Http\Request::create('/api/v1/homepage', 'GET'));
 *   printf("%d queries, %.1f ms\n", count(DB::getQueryLog()), (microtime(true) - $t) * 1000);
 *
 * (Warm each endpoint once first, and average several runs. Outside PHPUnit the cache
 * and session stores come from .env, so the database-backed rate limiter's queries are
 * included, exactly as in the running app; inside PHPUnit they are not.)
 */
class BenchmarkSeeder extends Seeder
{
    private const CHUNK = 500;

    public function run(): void
    {
        $this->populate((int) env('BENCH_ARTWORKS', 500));
    }

    /**
     * Adds a batch of related data. Ratios: 1 artist per 5 artworks, 1 exhibition and
     * 1 article per 20 artworks (each at least 2); every artwork has 2 images, every
     * media row has all 8 variants. The first artwork/artist/exhibition/article of the
     * batch is guaranteed to have every relation populated, so the returned handles
     * exercise the full eager-loading path of each detail endpoint.
     *
     * @return array{artwork_code: string, artist_slug: string, exhibition_slug: string, article_slug: string, page_slug: string}
     */
    public function populate(int $artworks): array
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('BenchmarkSeeder only runs in the local or testing environment.');
        }

        $artworks = max(3, $artworks);
        $batch = Str::lower(Str::random(6));

        $this->seedGlobals();

        $genreIds = $this->lookupIds(Genre::class, 'genre', ['Portret', 'Landşaft'], ['Portrait', 'Landscape']);
        $mediumIds = $this->lookupIds(Medium::class, 'medium', ['Yağlı boya', 'Akvarel'], ['Oil', 'Watercolour']);

        $artistIds = $this->createArtists($batch, max(2, intdiv($artworks, 5)));
        $artworkIds = $this->createArtworks($batch, $artworks, $artistIds, $genreIds, $mediumIds);
        $exhibitionSlug = $this->createExhibitions($batch, max(2, intdiv($artworks, 20)), $artistIds, $artworkIds);
        $articleSlug = $this->createArticles($batch, max(2, intdiv($artworks, 20)));

        return [
            'artwork_code' => "AN-BENCH-{$batch}-00000",
            'artist_slug' => "bench-{$batch}-artist-0",
            'exhibition_slug' => $exhibitionSlug,
            'article_slug' => $articleSlug,
            'page_slug' => 'collectors',
        ];
    }

    /**
     * One-time site-wide data: the structural pages + navigation, enquiry subjects, a
     * collectors page with an image section, FAQs, social links and branding settings.
     */
    private function seedGlobals(): void
    {
        if (SiteSetting::query()->where('key', 'logo_media_id')->exists()) {
            return;
        }

        app(PageSeeder::class)->run();
        app(EnquirySubjectSeeder::class)->run();

        $mediaIds = $this->makeMedia(4, 'global');

        $collectors = Page::query()->where('type', 'collectors')->firstOrFail();
        foreach (['how-to-buy', 'authenticity'] as $sortOrder => $key) {
            $section = $collectors->sections()->create([
                'key' => $key, 'media_id' => $mediaIds[$sortOrder], 'sort_order' => $sortOrder, 'is_active' => true,
            ]);
            $section->translations()->create(['locale' => 'az', 'heading' => "Bölmə {$key}", 'body' => 'Mətn.']);
            $section->translations()->create(['locale' => 'en', 'heading' => "Section {$key}", 'body' => 'Text.']);
        }

        $home = Page::query()->where('type', 'home')->firstOrFail();
        foreach (range(1, 3) as $n) {
            $faq = Faq::factory()->create(['page_id' => $home->id, 'sort_order' => $n]);
            $faq->translations()->create(['locale' => 'az', 'question' => "Sual {$n}?", 'answer' => 'Cavab.']);
            $faq->translations()->create(['locale' => 'en', 'question' => "Question {$n}?", 'answer' => 'Answer.']);
        }

        SocialLink::factory()->create(['platform' => 'instagram', 'sort_order' => 0, 'logo_media_id' => $mediaIds[2]]);
        SocialLink::factory()->create(['platform' => 'facebook', 'sort_order' => 1]);

        foreach ([
            'contact_email' => 'info@example.test', 'phone' => '+994 12 000 00 00', 'address' => 'Bakı',
            'whatsapp_number' => '994500000000', 'brand_text' => 'ArtNiyyətli', 'logo_media_id' => (string) $mediaIds[3],
        ] as $key => $value) {
            SiteSetting::query()->updateOrCreate(['key' => $key], ['value' => $value, 'type' => 'string']);
        }
    }

    /**
     * @param  class-string<Genre|Medium>  $model
     * @return array<int, int>
     */
    private function lookupIds(string $model, string $slugPrefix, array $az, array $en): array
    {
        $ids = [];

        foreach ($az as $i => $name) {
            $row = $model::query()->firstOrCreate(['slug' => "bench-{$slugPrefix}-{$i}"], ['sort_order' => $i, 'is_active' => true]);
            $row->translations()->firstOrCreate(['locale' => 'az'], ['name' => $name]);
            $row->translations()->firstOrCreate(['locale' => 'en'], ['name' => $en[$i]]);
            $ids[] = $row->id;
        }

        return $ids;
    }

    /** @return array<int, int> */
    private function createArtists(string $batch, int $count): array
    {
        $mediaIds = $this->makeMedia($count, "{$batch}-artist");
        $ids = [];

        for ($i = 0; $i < $count; $i++) {
            $artist = Artist::factory()->create([
                'sort_order' => $i, 'is_active' => true, 'representation_image_id' => $mediaIds[$i], 'birth_year' => 1950 + ($i % 50),
            ]);

            foreach (['az', 'en'] as $locale) {
                $artist->translations()->create([
                    'locale' => $locale, 'slug' => "bench-{$batch}-artist-{$i}", 'first_name' => "Ad{$i}", 'last_name' => 'Soyad',
                    'birth_place' => 'Bakı', 'direction' => 'Müasir', 'biography' => 'Bioqrafiya.', 'artistic_approach' => 'Yanaşma.',
                ]);
            }

            $exhibition = $artist->exhibitions()->create(['year' => 2000 + ($i % 20), 'sort_order' => 0]);
            $exhibition->translations()->create(['locale' => 'az', 'title' => 'Fərdi sərgi', 'venue' => 'Qalereya']);
            $award = $artist->awards()->create(['year' => 2005 + ($i % 15), 'sort_order' => 0]);
            $award->translations()->create(['locale' => 'az', 'title' => 'Mükafat']);

            $ids[] = $artist->id;
        }

        return $ids;
    }

    /**
     * @param  array<int, int>  $artistIds
     * @param  array<int, int>  $genreIds
     * @param  array<int, int>  $mediumIds
     * @return array<int, int> artwork ids in creation order
     */
    private function createArtworks(string $batch, int $count, array $artistIds, array $genreIds, array $mediumIds): array
    {
        $mediaIds = $this->makeMedia($count * 2, "{$batch}-artwork");
        $now = now();
        $codes = [];
        $rows = [];

        for ($i = 0; $i < $count; $i++) {
            $codes[$i] = sprintf('AN-BENCH-%s-%05d', $batch, $i);
            $rows[] = [
                'artist_id' => $artistIds[$i % count($artistIds)],
                'medium_id' => $mediumIds[$i % count($mediumIds)],
                'genre_id' => $genreIds[$i % count($genreIds)],
                'year_created' => 2000 + ($i % 25),
                'width_cm' => 60 + ($i % 40),
                'height_cm' => 80 + ($i % 30),
                'aspect_ratio' => round((60 + ($i % 40)) / (80 + ($i % 30)), 6),
                'price' => 500 + ($i * 37 % 20000),
                'show_price' => true,
                'availability' => $i % 9 === 8 ? 'sold' : 'available',
                'inventory_code' => $codes[$i],
                'featured' => $i % 10 === 0,
                'show_on_wall' => $i % 7 === 0,
                'sort_order' => $i,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        $this->insertChunked('artworks', $rows);
        $idByCode = DB::table('artworks')->where('inventory_code', 'like', "AN-BENCH-{$batch}-%")->pluck('id', 'inventory_code');

        $translations = [];
        $images = [];
        $artworkIds = [];

        foreach ($codes as $i => $code) {
            $id = $artworkIds[$i] = $idByCode[$code];

            foreach (['az' => 'Əsər', 'en' => 'Artwork'] as $locale => $label) {
                $translations[] = [
                    'artwork_id' => $id, 'locale' => $locale, 'slug' => "bench-{$batch}-artwork-{$i}",
                    'title' => "{$label} {$i}", 'short_description' => 'Qısa təsvir.', 'provenance' => 'Mənşə.',
                    'created_at' => $now, 'updated_at' => $now,
                ];
            }

            foreach (['main', 'detail'] as $k => $type) {
                $images[] = [
                    'artwork_id' => $id, 'media_id' => $mediaIds[$i * 2 + $k], 'type' => $type,
                    'sort_order' => $k, 'is_main' => $k === 0, 'created_at' => $now, 'updated_at' => $now,
                ];
            }
        }

        $this->insertChunked('artwork_translations', $translations);
        $this->insertChunked('artwork_images', $images);

        return $artworkIds;
    }

    /**
     * @param  array<int, int>  $artistIds
     * @param  array<int, int>  $artworkIds
     * @return string the slug of the first (current) exhibition
     */
    private function createExhibitions(string $batch, int $count, array $artistIds, array $artworkIds): string
    {
        $mediaIds = $this->makeMedia($count * 2, "{$batch}-exhibition");

        for ($i = 0; $i < $count; $i++) {
            $status = match (true) {
                $i === 0 => 'current',
                $i === 1 => 'upcoming',
                default => 'past',
            };

            $exhibition = Exhibition::factory()->create([
                'status' => $status,
                'start_date' => now()->subDays(10 + $i),
                'end_date' => now()->addDays(20),
            ]);

            foreach (['az', 'en'] as $locale) {
                $exhibition->translations()->create([
                    'locale' => $locale, 'slug' => "bench-{$batch}-exhibition-{$i}", 'title' => "Sərgi {$i}",
                    'venue' => 'Qalereya', 'short_text' => 'Qısa.', 'full_text' => 'Tam mətn.',
                ]);
            }

            $exhibition->artists()->attach(collect(array_slice($artistIds, 0, 2))->mapWithKeys(fn ($id, $k) => [$id => ['sort_order' => $k]])->all());
            $exhibition->artworks()->attach(collect(array_slice($artworkIds, $i, 3))->mapWithKeys(fn ($id, $k) => [$id => ['sort_order' => $k]])->all());

            foreach ([0, 1] as $k) {
                $exhibition->media()->create(['media_id' => $mediaIds[$i * 2 + $k], 'type' => 'photo', 'sort_order' => $k]);
            }
        }

        return "bench-{$batch}-exhibition-0";
    }

    /** @return string the slug of the first article */
    private function createArticles(string $batch, int $count): string
    {
        $mediaIds = $this->makeMedia($count * 2, "{$batch}-article");

        for ($i = 0; $i < $count; $i++) {
            $article = Article::factory()->create(['status' => 'published', 'is_active' => true, 'published_at' => now()->subDays($i + 1)]);

            foreach (['az', 'en'] as $locale) {
                $article->translations()->create([
                    'locale' => $locale, 'slug' => "bench-{$batch}-article-{$i}", 'title' => "Məqalə {$i}",
                    'short_text' => 'Qısa.', 'content' => 'Məzmun.',
                ]);
            }

            $article->media()->attach([$mediaIds[$i * 2] => ['sort_order' => 0], $mediaIds[$i * 2 + 1] => ['sort_order' => 1]]);
        }

        return "bench-{$batch}-article-0";
    }

    /**
     * Bulk-creates media rows plus all their public variants (every configured size ×
     * format), the shape MediaService::upload() produces, without touching real files.
     *
     * @return array<int, int> media ids in creation order
     */
    private function makeMedia(int $count, string $tag): array
    {
        $now = now();
        $rows = [];

        for ($n = 0; $n < $count; $n++) {
            $rows[] = [
                'type' => 'image', 'disk' => 'local', 'path' => "media/bench-{$tag}-{$n}/original.jpg",
                'original_filename' => "{$tag}-{$n}.jpg", 'mime_type' => 'image/jpeg', 'size_bytes' => 1_500_000,
                'original_width' => 1600, 'original_height' => 1200, 'aspect_ratio' => 1.333333,
                'created_at' => $now, 'updated_at' => $now,
            ];
        }

        $this->insertChunked('media', $rows);
        $ids = DB::table('media')->where('original_filename', 'like', "{$tag}-%")->orderBy('id')->pluck('id')->all();

        $variants = [];

        foreach ($ids as $id) {
            foreach (config('media.variants') as $variant => $variantConfig) {
                foreach (config('media.formats') as $format => $formatConfig) {
                    $variants[] = [
                        'media_id' => $id, 'variant' => "{$variant}-{$format}", 'disk' => 'public',
                        'path' => "media/{$id}/{$variant}-{$format}.{$formatConfig['extension']}",
                        'mime_type' => $formatConfig['mime'], 'size_bytes' => 120_000,
                        'width' => $variantConfig['max_dimension'], 'height' => intdiv($variantConfig['max_dimension'] * 3, 4),
                        'created_at' => $now, 'updated_at' => $now,
                    ];
                }
            }
        }

        $this->insertChunked('media_variants', $variants);

        return $ids;
    }

    /** @param  array<int, array<string, mixed>>  $rows */
    private function insertChunked(string $table, array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            DB::table($table)->insert($chunk);
        }
    }
}
