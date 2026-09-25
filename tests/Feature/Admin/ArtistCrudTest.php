<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Media;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtistCrudTest extends TestCase
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

    private function artistPayload(array $overrides = []): array
    {
        return array_merge([
            'is_active' => true,
            'birth_year' => 1985,
            'translations' => [
                ['locale' => 'az', 'slug' => 'aygun-mammadova', 'first_name' => 'Aygün', 'last_name' => 'Məmmədova'],
            ],
        ], $overrides);
    }

    public function test_administrator_can_create_list_and_update_an_artist(): void
    {
        $created = $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload());
        $created->assertOk();
        $id = $created->json('data.id');

        $this->actingAs($this->admin)->getJson('/admin/artists')->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->admin)->putJson("/admin/artists/{$id}", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);
    }

    public function test_portrait_can_be_attached_via_media_id(): void
    {
        $media = Media::factory()->create();

        $created = $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload([
            'representation_image_id' => $media->id,
        ]));

        $created->assertOk();
        $created->assertJsonPath('data.representation_image_id', $media->id);
    }

    public function test_updating_the_en_translation_does_not_overwrite_the_az_translation(): void
    {
        $created = $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload());
        $id = $created->json('data.id');

        $this->actingAs($this->admin)->putJson("/admin/artists/{$id}", [
            'translations' => [
                ['locale' => 'en', 'slug' => 'aygun-mammadova-en', 'first_name' => 'Aygun', 'last_name' => 'Mammadova'],
            ],
        ])->assertOk();

        $azShow = $this->actingAs($this->admin)->getJson("/admin/artists/{$id}?locale=az");
        $azShow->assertJsonPath('data.translation.first_name', 'Aygün');
    }

    public function test_exhibitions_and_awards_are_saved_and_replaced_on_update(): void
    {
        $payload = $this->artistPayload([
            'exhibitions' => [
                ['year' => 2020, 'translations' => [['locale' => 'az', 'title' => 'Bakı Bienalı', 'venue' => 'YARAT']]],
            ],
            'awards' => [
                ['year' => 2019, 'translations' => [['locale' => 'az', 'title' => 'İl rəssamı']]],
            ],
        ]);

        $created = $this->actingAs($this->admin)->postJson('/admin/artists', $payload);
        $id = $created->json('data.id');
        $created->assertJsonCount(1, 'data.exhibitions');
        $created->assertJsonCount(1, 'data.awards');

        $updated = $this->actingAs($this->admin)->putJson("/admin/artists/{$id}", [
            'exhibitions' => [],
            'awards' => [],
        ]);

        $updated->assertOk();
        $updated->assertJsonCount(0, 'data.exhibitions');
        $updated->assertJsonCount(0, 'data.awards');
    }

    public function test_search_filters_by_name(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload());
        $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload([
            'translations' => [['locale' => 'az', 'slug' => 'someone-else', 'first_name' => 'Elvin', 'last_name' => 'Quliyev']],
        ]));

        $response = $this->actingAs($this->admin)->getJson('/admin/artists?search=Aygün');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_duplicate_slug_for_same_locale_is_rejected(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload())->assertOk();

        $response = $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload([
            'translations' => [['locale' => 'az', 'slug' => 'aygun-mammadova', 'first_name' => 'Different', 'last_name' => 'Person']],
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('translations.0.slug');
    }

    public function test_unauthenticated_request_is_denied(): void
    {
        $this->getJson('/admin/artists')->assertStatus(401);
        $this->postJson('/admin/artists', $this->artistPayload())->assertStatus(401);
    }

    public function test_editor_can_manage_artists(): void
    {
        $editor = User::factory()->create(['username' => 'ed.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $this->actingAs($editor)->postJson('/admin/artists', $this->artistPayload())->assertOk();
    }

    public function test_administrator_can_delete_an_artist_without_artworks(): void
    {
        $artistId = $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload())->json('data.id');

        $response = $this->actingAs($this->admin)->deleteJson("/admin/artists/{$artistId}");

        $response->assertOk();
        $this->assertSoftDeleted('artists', ['id' => $artistId]);
        $this->actingAs($this->admin)->getJson('/admin/artists')->assertJsonMissing(['id' => $artistId]);
    }

    public function test_deleting_an_artist_with_artworks_is_rejected(): void
    {
        $artistId = $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload())->json('data.id');

        Artwork::factory()->create([
            'artist_id' => $artistId,
            'genre_id' => Genre::factory()->create(['slug' => 'genre-'.uniqid()])->id,
            'medium_id' => Medium::factory()->create(['slug' => 'medium-'.uniqid()])->id,
        ]);

        $response = $this->actingAs($this->admin)->deleteJson("/admin/artists/{$artistId}");

        $response->assertStatus(409);
        $this->assertNull(Artist::find($artistId)->deleted_at);
    }

    public function test_unauthenticated_request_cannot_delete_an_artist(): void
    {
        $artist = Artist::factory()->create();

        $this->deleteJson("/admin/artists/{$artist->id}")->assertStatus(401);
        $this->assertNull($artist->fresh()->deleted_at);
    }

    public function test_creating_an_artist_without_an_az_translation_is_rejected(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload([
            'translations' => [['locale' => 'en', 'slug' => 'aygun-en', 'first_name' => 'Aygun', 'last_name' => 'Mammadova']],
        ]))->assertStatus(422)->assertJsonValidationErrors('translations');

        $this->assertSame(0, Artist::query()->count());
    }

    public function test_creating_an_artist_with_an_invalid_or_missing_az_slug_is_rejected(): void
    {
        $az = ['locale' => 'az', 'first_name' => 'Aygün', 'last_name' => 'Məmmədova'];

        $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload(['translations' => [$az]]))
            ->assertStatus(422)->assertJsonValidationErrors('translations.0.slug');
        $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload(['translations' => [$az + ['slug' => 'bad slug/']]]))
            ->assertStatus(422)->assertJsonValidationErrors('translations.0.slug');
        $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload(['translations' => [$az + ['slug' => '']]]))
            ->assertStatus(422)->assertJsonValidationErrors('translations.0.slug');
    }

    public function test_creating_an_artist_with_az_and_en_translations_still_works(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload([
            'translations' => [
                ['locale' => 'az', 'slug' => 'aygun', 'first_name' => 'Aygün', 'last_name' => 'Məmmədova'],
                ['locale' => 'en', 'slug' => 'aygun-en', 'first_name' => 'Aygun', 'last_name' => 'Mammadova'],
            ],
        ]))->assertOk();
    }

    public function test_updating_with_translations_that_omit_az_is_rejected_when_the_artist_has_none_stored(): void
    {
        $artist = Artist::factory()->create(['is_active' => true]);

        $this->actingAs($this->admin)->putJson("/admin/artists/{$artist->id}", [
            'translations' => [['locale' => 'en', 'slug' => 'only-en', 'first_name' => 'A', 'last_name' => 'B']],
        ])->assertStatus(422)->assertJsonValidationErrors('translations');
    }

    public function test_updating_without_translations_leaves_the_stored_az_translation_alone(): void
    {
        $id = $this->actingAs($this->admin)->postJson('/admin/artists', $this->artistPayload())->json('data.id');

        $this->actingAs($this->admin)->putJson("/admin/artists/{$id}", ['birth_year' => 1990])->assertOk();

        $this->assertSame('aygun-mammadova', Artist::query()->find($id)->translations()->where('locale', 'az')->value('slug'));
    }
}
