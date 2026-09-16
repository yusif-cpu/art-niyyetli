<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Page;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);
    }

    private function createUserWithRole(string $role, string $username = 'jane.admin'): User
    {
        $user = User::factory()->create(['username' => $username]);
        $user->roles()->attach(Role::query()->firstOrCreate(['name' => $role]));

        return $user;
    }

    public function test_unauthenticated_requests_are_denied_across_the_new_resources(): void
    {
        $this->getJson('/admin/pages')->assertStatus(401);
        $this->postJson('/admin/pages', [])->assertStatus(401);
        $this->getJson('/admin/faqs')->assertStatus(401);
        $this->postJson('/admin/faqs', [])->assertStatus(401);
        $this->getJson('/admin/settings')->assertStatus(401);
        $this->putJson('/admin/settings', [])->assertStatus(401);
        $this->getJson('/admin/social-links')->assertStatus(401);
        $this->postJson('/admin/social-links', [])->assertStatus(401);
    }

    public function test_administrator_and_editor_can_both_read_and_write_the_new_resources(): void
    {
        $page = Page::query()->create(['type' => 'home', 'is_active' => true]);

        foreach (['administrator', 'editor'] as $role) {
            $user = $this->createUserWithRole($role, $role.'.user');

            $this->actingAs($user)->getJson('/admin/pages')->assertOk();
            $this->actingAs($user)->getJson('/admin/faqs')->assertOk();
            $this->actingAs($user)->getJson('/admin/settings')->assertOk();
            $this->actingAs($user)->getJson('/admin/social-links')->assertOk();

            $this->actingAs($user)->postJson('/admin/faqs', [
                'page_id' => $page->id,
                'is_active' => true,
                'translations' => [['locale' => 'az', 'question' => 'Q', 'answer' => 'A']],
            ])->assertOk();
        }
    }

    public function test_dashboard_stats_reflect_real_counts(): void
    {
        $admin = $this->createUserWithRole('administrator');

        $before = $this->actingAs($admin)->getJson('/admin/dashboard')->json('stats.artists');

        Artist::factory()->count(2)->create();

        $after = $this->actingAs($admin)->getJson('/admin/dashboard')->json('stats.artists');

        $this->assertSame($before + 2, $after);
        $this->assertSame(Artist::count(), $after);
    }
}
