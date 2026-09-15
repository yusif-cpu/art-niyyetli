<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\EnquirySubject;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ArtworkCrudTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
    }

    private function validArtworkPayload(array $overrides = []): array
    {
        return array_merge([
            'artist_id' => Artist::factory()->create()->id,
            'medium_id' => Medium::factory()->create()->id,
            'genre_id' => Genre::factory()->create()->id,
            'year_created' => 2020,
            'width_cm' => 50,
            'height_cm' => 70,
            'price' => 1500,
            'show_price' => true,
            'availability' => 'available',
            'certificate' => false,
            'featured' => false,
            'show_on_wall' => false,
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'slug' => 'test-artwork-'.uniqid(), 'title' => 'Test', 'short_description' => 'Short', 'provenance' => 'Provenance'],
            ],
        ], $overrides);
    }

    private function data(TestResponse $response): array
    {
        return $response->json('data') ?? $response->json();
    }

    public function test_create_without_inventory_code_generates_one(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload());

        $response->assertOk();
        $data = $this->data($response);

        $this->assertMatchesRegularExpression('/^AN-\d{4}-\d{3}$/', $data['inventory_code']);
        $this->assertDatabaseHas('artworks', ['id' => $data['id'], 'inventory_code' => $data['inventory_code']]);
        $this->assertDatabaseHas('artwork_translations', ['artwork_id' => $data['id'], 'locale' => 'az']);
    }

    public function test_create_with_manual_inventory_code_keeps_it_exactly(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'inventory_code' => 'AN-2020-CUSTOM',
        ]));

        $response->assertOk();
        $this->assertSame('AN-2020-CUSTOM', $this->data($response)['inventory_code']);
    }

    public function test_client_supplied_aspect_ratio_is_ignored(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/admin/artworks', $this->validArtworkPayload([
            'width_cm' => 40,
            'height_cm' => 80,
            'aspect_ratio' => 999.999999,
        ]));

        $response->assertOk();
        $this->assertEqualsWithDelta(0.5, $this->data($response)['aspect_ratio'], 0.0001);
    }

    public function test_update_with_only_one_locale_does_not_touch_the_other_locale(): void
    {
        $artwork = Artwork::factory()->create();
        $artwork->translations()->create(['locale' => 'az', 'slug' => 'az-slug-'.uniqid(), 'title' => 'AZ Title', 'short_description' => 'S', 'provenance' => 'P']);
        $artwork->translations()->create(['locale' => 'en', 'slug' => 'en-slug-'.uniqid(), 'title' => 'EN Title', 'short_description' => 'S', 'provenance' => 'P']);

        $response = $this->actingAs($this->admin)->putJson("/admin/artworks/{$artwork->id}", [
            'translations' => [
                ['locale' => 'az', 'slug' => 'az-slug-updated-'.uniqid(), 'title' => 'AZ Title Updated', 'short_description' => 'S2', 'provenance' => 'P2'],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('artwork_translations', ['artwork_id' => $artwork->id, 'locale' => 'en', 'title' => 'EN Title']);
        $this->assertDatabaseHas('artwork_translations', ['artwork_id' => $artwork->id, 'locale' => 'az', 'title' => 'AZ Title Updated']);
    }

    public function test_update_recomputes_aspect_ratio(): void
    {
        $artwork = Artwork::factory()->create(['width_cm' => 50, 'height_cm' => 50]);

        $response = $this->actingAs($this->admin)->putJson("/admin/artworks/{$artwork->id}", [
            'width_cm' => 30,
            'height_cm' => 60,
        ]);

        $response->assertOk();
        $this->assertEqualsWithDelta(0.5, $this->data($response)['aspect_ratio'], 0.0001);
    }

    public function test_search_by_title_and_inventory_code(): void
    {
        $titled = Artwork::factory()->create(['inventory_code' => 'AN-2020-100']);
        $titled->translations()->create(['locale' => 'az', 'slug' => 'unique-slug-'.uniqid(), 'title' => 'Sunset Over Baku', 'short_description' => 'S', 'provenance' => 'P']);

        Artwork::factory()->create(['inventory_code' => 'AN-2020-200'])
            ->translations()->create(['locale' => 'az', 'slug' => 'other-slug-'.uniqid(), 'title' => 'Unrelated', 'short_description' => 'S', 'provenance' => 'P']);

        $byTitle = $this->actingAs($this->admin)->getJson('/admin/artworks?search=Sunset');
        $byTitle->assertOk();
        $this->assertCount(1, $byTitle->json('data'));

        $byCode = $this->actingAs($this->admin)->getJson('/admin/artworks?search=AN-2020-100');
        $byCode->assertOk();
        $this->assertCount(1, $byCode->json('data'));
    }

    public function test_filters_by_artist_medium_genre_availability_and_active(): void
    {
        $artist = Artist::factory()->create();
        $medium = Medium::factory()->create();
        $genre = Genre::factory()->create();

        $match = Artwork::factory()->create([
            'artist_id' => $artist->id, 'medium_id' => $medium->id, 'genre_id' => $genre->id,
            'availability' => 'available', 'is_active' => true,
        ]);

        Artwork::factory()->create(['availability' => 'sold', 'is_active' => false]);

        $response = $this->actingAs($this->admin)->getJson(
            "/admin/artworks?artist_id={$artist->id}&medium_id={$medium->id}&genre_id={$genre->id}&availability=available&is_active=1"
        );

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($match->id));
        $this->assertCount(1, $ids);
    }

    public function test_pagination_returns_correct_page_shape(): void
    {
        Artwork::factory()->count(25)->create();

        $response = $this->actingAs($this->admin)->getJson('/admin/artworks?per_page=10');

        $response->assertOk();
        $this->assertCount(10, $response->json('data'));
        $this->assertSame(25, $response->json('meta.total'));
        $this->assertSame(3, $response->json('meta.last_page'));
    }

    public function test_delete_on_available_artwork_soft_deletes_it(): void
    {
        $artwork = Artwork::factory()->create(['availability' => 'available']);

        $this->actingAs($this->admin)->deleteJson("/admin/artworks/{$artwork->id}")->assertOk();

        $this->assertSoftDeleted('artworks', ['id' => $artwork->id]);
        $this->actingAs($this->admin)->getJson("/admin/artworks/{$artwork->id}")->assertStatus(404);
    }

    public function test_delete_on_sold_artwork_is_refused(): void
    {
        $artwork = Artwork::factory()->create(['availability' => 'sold', 'year_sold' => 2021]);

        $this->actingAs($this->admin)->deleteJson("/admin/artworks/{$artwork->id}")->assertStatus(409);

        $this->assertDatabaseHas('artworks', ['id' => $artwork->id, 'deleted_at' => null]);
    }

    public function test_delete_on_artwork_with_enquiries_is_refused(): void
    {
        $artwork = Artwork::factory()->create(['availability' => 'available']);
        $subject = EnquirySubject::create(['key' => 'general', 'sort_order' => 0, 'is_active' => true]);
        $artwork->enquiries()->create([
            'enquiry_subject_id' => $subject->id,
            'submitted_at' => now(),
            'name' => 'A Buyer',
            'contact' => 'buyer@example.com',
            'message' => 'Interested.',
        ]);

        $this->actingAs($this->admin)->deleteJson("/admin/artworks/{$artwork->id}")->assertStatus(409);

        $this->assertDatabaseHas('artworks', ['id' => $artwork->id, 'deleted_at' => null]);
    }
}
