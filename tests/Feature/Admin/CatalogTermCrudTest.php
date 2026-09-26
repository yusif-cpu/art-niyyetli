<?php

namespace Tests\Feature\Admin;

use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CatalogTermCrudTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->admin = $this->userWithRole('administrator', 'jane.admin');
    }

    private function userWithRole(string $role, string $username): User
    {
        $user = User::factory()->create(['username' => $username]);
        $user->roles()->attach(Role::query()->firstOrCreate(['name' => $role]));

        return $user;
    }

    /** @return array<string, array{0: string, 1: class-string}> */
    public static function terms(): array
    {
        return ['genres' => ['genres', Genre::class], 'mediums' => ['mediums', Medium::class]];
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'slug' => 'oil-paint',
            'sort_order' => 3,
            'is_active' => true,
            'translations' => [
                ['locale' => 'az', 'name' => 'Yağlı boya'],
                ['locale' => 'en', 'name' => 'Oil paint'],
            ],
        ], $overrides);
    }

    #[DataProvider('terms')]
    public function test_administrator_can_create_list_show_update_and_delete(string $path, string $model): void
    {
        $created = $this->actingAs($this->admin)->postJson("/admin/{$path}", $this->payload());
        $created->assertOk()
            ->assertJsonPath('data.slug', 'oil-paint')
            ->assertJsonPath('data.name', 'Yağlı boya')
            ->assertJsonPath('data.sort_order', 3)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonCount(2, 'data.translations');
        $id = $created->json('data.id');

        $this->actingAs($this->admin)->getJson("/admin/{$path}")->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->admin)->getJson("/admin/{$path}/{$id}?locale=en")->assertOk()->assertJsonPath('data.name', 'Oil paint');

        $this->actingAs($this->admin)->putJson("/admin/{$path}/{$id}", [
            'slug' => 'oil',
            'is_active' => false,
            'translations' => [['locale' => 'en', 'name' => 'Oil']],
        ])->assertOk()
            ->assertJsonPath('data.slug', 'oil')
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.name', 'Yağlı boya'); // the AZ translation is untouched

        $this->actingAs($this->admin)->deleteJson("/admin/{$path}/{$id}")->assertOk();
        $this->assertSame(0, $model::query()->count());
    }

    #[DataProvider('terms')]
    public function test_create_defaults_sort_order_to_the_end_of_the_list(string $path, string $model): void
    {
        $model::factory()->create(['slug' => 'existing', 'sort_order' => 7]);
        $payload = $this->payload();
        unset($payload['sort_order']);

        $this->actingAs($this->admin)->postJson("/admin/{$path}", $payload)->assertOk()->assertJsonPath('data.sort_order', 8);
    }

    #[DataProvider('terms')]
    public function test_a_partial_update_keeps_the_stored_values(string $path, string $model): void
    {
        $id = $this->actingAs($this->admin)->postJson("/admin/{$path}", $this->payload())->json('data.id');

        $this->actingAs($this->admin)->putJson("/admin/{$path}/{$id}", ['is_active' => false, 'sort_order' => null])
            ->assertOk()
            ->assertJsonPath('data.slug', 'oil-paint')
            ->assertJsonPath('data.sort_order', 3)
            ->assertJsonCount(2, 'data.translations');
    }

    #[DataProvider('terms')]
    public function test_validation_rejects_bad_payloads(string $path, string $model): void
    {
        $this->actingAs($this->admin)->postJson("/admin/{$path}", [])->assertUnprocessable()
            ->assertJsonValidationErrors(['slug', 'is_active', 'translations']);

        $this->actingAs($this->admin)->postJson("/admin/{$path}", $this->payload(['slug' => 'Not A Slug/']))
            ->assertUnprocessable()->assertJsonValidationErrors('slug');

        $this->actingAs($this->admin)->postJson("/admin/{$path}", $this->payload(['sort_order' => -1]))
            ->assertUnprocessable()->assertJsonValidationErrors('sort_order');

        $this->actingAs($this->admin)->postJson("/admin/{$path}", $this->payload(['translations' => [['locale' => 'en', 'name' => 'Oil']]]))
            ->assertUnprocessable()->assertJsonValidationErrors('translations');

        $this->actingAs($this->admin)->postJson("/admin/{$path}", $this->payload(['translations' => [['locale' => 'az', 'name' => '']]]))
            ->assertUnprocessable()->assertJsonValidationErrors('translations.0.name');

        $this->actingAs($this->admin)->postJson("/admin/{$path}", $this->payload(['translations' => [
            ['locale' => 'az', 'name' => 'A'], ['locale' => 'az', 'name' => 'B'],
        ]]))->assertUnprocessable()->assertJsonValidationErrors('translations');

        $this->actingAs($this->admin)->postJson("/admin/{$path}", $this->payload(['translations' => [['locale' => 'xx', 'name' => 'A']]]))
            ->assertUnprocessable()->assertJsonValidationErrors('translations.0.locale');
    }

    #[DataProvider('terms')]
    public function test_slug_must_be_unique_but_may_be_kept_on_update(string $path, string $model): void
    {
        $model::factory()->create(['slug' => 'taken']);
        $id = $this->actingAs($this->admin)->postJson("/admin/{$path}", $this->payload())->json('data.id');

        $this->actingAs($this->admin)->postJson("/admin/{$path}", $this->payload(['slug' => 'taken']))
            ->assertUnprocessable()->assertJsonValidationErrors('slug');

        $this->actingAs($this->admin)->putJson("/admin/{$path}/{$id}", ['slug' => 'taken'])
            ->assertUnprocessable()->assertJsonValidationErrors('slug');

        $this->actingAs($this->admin)->putJson("/admin/{$path}/{$id}", ['slug' => 'oil-paint', 'is_active' => false])->assertOk();
    }

    #[DataProvider('terms')]
    public function test_an_update_without_a_stored_az_translation_must_send_one(string $path, string $model): void
    {
        $term = $model::factory()->create(['slug' => 'enonly']);
        $term->translations()->create(['locale' => 'en', 'name' => 'English only']);

        $this->actingAs($this->admin)->putJson("/admin/{$path}/{$term->id}", ['translations' => [['locale' => 'en', 'name' => 'X']]])
            ->assertUnprocessable()->assertJsonValidationErrors('translations');
    }

    #[DataProvider('terms')]
    public function test_a_term_used_by_artworks_cannot_be_deleted_even_if_the_artwork_is_archived(string $path, string $model): void
    {
        $artwork = Artwork::factory()->create();
        $column = $model === Genre::class ? 'genre_id' : 'medium_id';
        $term = $model::query()->findOrFail($artwork->{$column});

        $this->actingAs($this->admin)->deleteJson("/admin/{$path}/{$term->id}")->assertStatus(409);

        $artwork->delete();

        $this->actingAs($this->admin)->deleteJson("/admin/{$path}/{$term->id}")->assertStatus(409);
        $this->assertNotNull($model::query()->find($term->id));
    }

    #[DataProvider('terms')]
    public function test_editors_can_manage_and_unauthenticated_or_unprivileged_users_cannot(string $path, string $model): void
    {
        $this->postJson("/admin/{$path}", $this->payload())->assertStatus(401);
        $this->getJson("/admin/{$path}")->assertStatus(401);

        $stranger = User::factory()->create(['username' => 'no.role']);
        $this->actingAs($stranger)->getJson("/admin/{$path}")->assertForbidden();
        $this->actingAs($stranger)->postJson("/admin/{$path}", $this->payload())->assertForbidden();

        $editor = $this->userWithRole('editor', 'edith.editor');
        $this->actingAs($editor)->postJson("/admin/{$path}", $this->payload())->assertOk();
    }

    public function test_admin_writes_show_up_on_the_public_endpoints(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/genres', $this->payload(['slug' => 'portrait']))->assertOk();
        $this->actingAs($this->admin)->postJson('/admin/mediums', $this->payload(['slug' => 'canvas', 'is_active' => false]))->assertOk();

        $this->getJson('/api/v1/genres')->assertOk()->assertJsonPath('data.0.slug', 'portrait')->assertJsonPath('data.0.name', 'Yağlı boya');
        $this->getJson('/api/v1/mediums')->assertOk()->assertJsonCount(0, 'data'); // inactive terms stay hidden
    }
}
