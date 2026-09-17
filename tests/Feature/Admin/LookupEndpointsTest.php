<?php

namespace Tests\Feature\Admin;

use App\Models\Genre;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LookupEndpointsTest extends TestCase
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

    public function test_genres_lookup_returns_translated_names(): void
    {
        $genre = Genre::factory()->create(['slug' => 'painting']);
        $genre->translations()->create(['locale' => 'az', 'name' => 'Rəngkarlıq']);

        $response = $this->actingAs($this->admin)->getJson('/admin/genres');

        $response->assertOk();
        $response->assertJsonFragment(['slug' => 'painting', 'name' => 'Rəngkarlıq']);
    }

    public function test_mediums_lookup_returns_translated_names(): void
    {
        $medium = Medium::factory()->create(['slug' => 'oil']);
        $medium->translations()->create(['locale' => 'az', 'name' => 'Yağlı boya']);

        $response = $this->actingAs($this->admin)->getJson('/admin/mediums');

        $response->assertOk();
        $response->assertJsonFragment(['slug' => 'oil', 'name' => 'Yağlı boya']);
    }

    public function test_lookups_require_authentication(): void
    {
        $this->getJson('/admin/genres')->assertStatus(401);
        $this->getJson('/admin/mediums')->assertStatus(401);
    }
}
