<?php

namespace Tests\Feature\Api;

use App\Models\Page;
use Database\Seeders\PageSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LegalPagesApiTest extends TestCase
{
    use RefreshDatabase;

    private const EXPECTED = [
        'privacy-policy' => ['az' => 'Məxfilik siyasəti', 'en' => 'Privacy Policy'],
        'terms' => ['az' => 'İstifadə şərtləri', 'en' => 'Terms & Conditions'],
        'shipping-returns' => ['az' => 'Çatdırılma və qaytarılma', 'en' => 'Shipping & Returns'],
        'copyright' => ['az' => 'Müəllif hüquqları', 'en' => 'Copyright'],
    ];

    public function test_each_legal_page_resolves_through_the_existing_page_infrastructure_in_az_and_en(): void
    {
        $this->seed(PageSeeder::class);

        foreach (self::EXPECTED as $slug => $titles) {
            $az = $this->getJson("/api/v1/pages/{$slug}");
            $az->assertOk();
            $az->assertJsonPath('data.slug', $slug);
            $az->assertJsonPath('data.type', 'custom');
            $az->assertJsonPath('data.title', $titles['az']);

            $en = $this->getJson("/api/v1/pages/{$slug}?locale=en");
            $en->assertOk();
            $en->assertJsonPath('data.title', $titles['en']);
        }
    }

    public function test_the_seeder_creates_exactly_four_legal_pages_idempotently(): void
    {
        $this->seed(PageSeeder::class);
        $this->seed(PageSeeder::class);

        $this->assertSame(4, Page::query()->where('type', 'custom')->count());
    }

    public function test_an_inactive_legal_page_returns_404(): void
    {
        $this->seed(PageSeeder::class);

        Page::query()
            ->whereHas('translations', fn ($q) => $q->where('slug', 'terms'))
            ->update(['is_active' => false]);

        $this->getJson('/api/v1/pages/terms')->assertStatus(404);
    }
}
