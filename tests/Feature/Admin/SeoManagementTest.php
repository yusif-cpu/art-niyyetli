<?php

namespace Tests\Feature\Admin;

use App\Enums\Locale;
use App\Models\Media;
use App\Models\Role;
use App\Models\SeoMetadata;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Seo\CreatesSeoSubjects;
use Tests\TestCase;

class SeoManagementTest extends TestCase
{
    use CreatesSeoSubjects;
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
    }

    #[DataProvider('seoKinds')]
    public function test_seo_can_be_set_per_locale_and_is_returned_by_the_admin_show(string $kind): void
    {
        $subject = $this->makeSeoSubject($kind);
        $image = $this->makeSeoImage('seo/admin.webp');
        $path = $this->adminSeoPath($kind, $subject);

        $response = $this->actingAs($this->admin)->putJson($path, ['seo' => [
            ['locale' => 'az', 'title' => 'AZ başlıq', 'description' => 'AZ təsvir', 'og_image_id' => $image->id],
            ['locale' => 'en', 'title' => 'EN title'],
        ]]);

        $response->assertOk();
        $seo = collect($response->json('data.seo'))->keyBy('locale');
        $this->assertSame('AZ başlıq', $seo['az']['title']);
        $this->assertSame($image->id, $seo['az']['og_image_id']);
        $this->assertStringEndsWith('seo/admin.webp', $seo['az']['og_image_url']);
        $this->assertSame('EN title', $seo['en']['title']);
        $this->assertNull($seo['en']['description']);
        $this->assertNull($seo['en']['og_image_id']);

        $this->actingAs($this->admin)->getJson($path)->assertOk()->assertJsonCount(2, 'data.seo');
    }

    #[DataProvider('seoKinds')]
    public function test_updating_one_locale_leaves_the_other_and_omitting_seo_changes_nothing(string $kind): void
    {
        $subject = $this->makeSeoSubject($kind);
        $subject->seoMetadata()->create(['locale' => 'az', 'title' => 'AZ']);
        $subject->seoMetadata()->create(['locale' => 'en', 'title' => 'EN']);
        $path = $this->adminSeoPath($kind, $subject);

        $this->actingAs($this->admin)->putJson($path, ['seo' => [['locale' => 'en', 'title' => 'EN v2']]])->assertOk();
        $this->assertSame('AZ', $subject->seoOverride(Locale::Az)->title);
        $this->assertSame('EN v2', $subject->seoOverride(Locale::En)->title);

        $this->actingAs($this->admin)->putJson($path, ['is_active' => true])->assertOk();
        $this->assertSame(2, SeoMetadata::query()->count());
    }

    #[DataProvider('seoKinds')]
    public function test_an_entry_with_all_values_empty_clears_that_locale_only(string $kind): void
    {
        $subject = $this->makeSeoSubject($kind);
        $subject->seoMetadata()->create(['locale' => 'az', 'title' => 'AZ', 'description' => 'D']);
        $subject->seoMetadata()->create(['locale' => 'en', 'title' => 'EN']);

        $this->actingAs($this->admin)->putJson($this->adminSeoPath($kind, $subject), ['seo' => [
            ['locale' => 'az', 'title' => '  ', 'description' => '', 'og_image_id' => null],
        ]])->assertOk();

        $this->assertDatabaseMissing('seo_metadata', ['seoable_id' => $subject->id, 'locale' => 'az']);
        $this->assertDatabaseHas('seo_metadata', ['seoable_id' => $subject->id, 'locale' => 'en', 'title' => 'EN']);
        $this->getJson($this->publicSeoUrl($kind, $subject))->assertJsonPath('data.seo', null);
    }

    #[DataProvider('seoKinds')]
    public function test_saving_twice_updates_the_same_row_instead_of_duplicating(string $kind): void
    {
        $subject = $this->makeSeoSubject($kind);
        $path = $this->adminSeoPath($kind, $subject);

        $this->actingAs($this->admin)->putJson($path, ['seo' => [['locale' => 'az', 'title' => 'One']]])->assertOk();
        $this->actingAs($this->admin)->putJson($path, ['seo' => [['locale' => 'az', 'title' => 'Two']]])->assertOk();

        $this->assertSame(1, SeoMetadata::query()->where('seoable_id', $subject->id)->count());
        $this->assertSame('Two', SeoMetadata::query()->where('seoable_id', $subject->id)->value('title'));
    }

    #[DataProvider('seoKinds')]
    public function test_validation(string $kind): void
    {
        $subject = $this->makeSeoSubject($kind);
        $path = $this->adminSeoPath($kind, $subject);
        $video = Media::factory()->create(['type' => 'video', 'mime_type' => 'video/mp4']);
        $deleted = Media::factory()->create();
        $deleted->delete();

        $bad = [
            'unknown locale' => [['locale' => 'xx', 'title' => 'T'], 'seo.0.locale'],
            'title too long' => [['locale' => 'az', 'title' => str_repeat('a', 256)], 'seo.0.title'],
            'description too long' => [['locale' => 'az', 'description' => str_repeat('a', 161)], 'seo.0.description'],
            'missing image' => [['locale' => 'az', 'og_image_id' => 999999], 'seo.0.og_image_id'],
            'video is not an image' => [['locale' => 'az', 'og_image_id' => $video->id], 'seo.0.og_image_id'],
            'deleted image' => [['locale' => 'az', 'og_image_id' => $deleted->id], 'seo.0.og_image_id'],
        ];

        foreach ($bad as $label => [$entry, $errorKey]) {
            $this->actingAs($this->admin)->putJson($path, ['seo' => [$entry]])
                ->assertUnprocessable()->assertJsonValidationErrors($errorKey);
            $this->assertSame(0, SeoMetadata::query()->count(), $label);
        }

        $this->actingAs($this->admin)->putJson($path, ['seo' => [
            ['locale' => 'az', 'title' => 'A'], ['locale' => 'az', 'title' => 'B'],
        ]])->assertUnprocessable()->assertJsonValidationErrors('seo');
    }

    #[DataProvider('seoKinds')]
    public function test_a_media_file_used_as_an_og_image_cannot_be_deleted(string $kind): void
    {
        $subject = $this->makeSeoSubject($kind);
        $image = $this->makeSeoImage();

        $this->actingAs($this->admin)->putJson($this->adminSeoPath($kind, $subject), ['seo' => [
            ['locale' => 'az', 'og_image_id' => $image->id],
        ]])->assertOk();

        $this->actingAs($this->admin)->deleteJson("/admin/media/{$image->id}")->assertStatus(409);
        $this->assertNotNull($image->fresh());
    }

    public function test_seo_can_be_supplied_when_creating_an_artist_and_an_article(): void
    {
        $image = $this->makeSeoImage();
        $seo = [['locale' => 'az', 'title' => 'Yeni', 'description' => 'Təsvir', 'og_image_id' => $image->id]];

        $artist = $this->actingAs($this->admin)->postJson('/admin/artists', [
            'is_active' => true,
            'translations' => [['locale' => 'az', 'slug' => 'yeni-ressam', 'first_name' => 'A', 'last_name' => 'B']],
            'seo' => $seo,
        ]);
        $artist->assertOk()->assertJsonPath('data.seo.0.title', 'Yeni')->assertJsonPath('data.seo.0.og_image_id', $image->id);

        $article = $this->actingAs($this->admin)->postJson('/admin/articles', [
            'type' => 'news', 'status' => 'draft', 'is_active' => true,
            'translations' => [['locale' => 'az', 'slug' => 'yeni-meqale', 'title' => 'T', 'short_text' => 'S', 'content' => 'C']],
            'seo' => $seo,
        ]);
        $article->assertOk()->assertJsonPath('data.seo.0.description', 'Təsvir');
    }

    public function test_a_failed_validation_on_create_saves_no_seo(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/artists', [
            'is_active' => true,
            'translations' => [['locale' => 'az', 'slug' => 'x-y', 'first_name' => 'A', 'last_name' => 'B']],
            'seo' => [['locale' => 'az', 'title' => str_repeat('a', 300)]],
        ])->assertUnprocessable();

        $this->assertSame(0, SeoMetadata::query()->count());
    }

    public function test_seo_requires_authentication_and_the_admin_permission(): void
    {
        $subject = $this->makeSeoSubject('artist');
        $path = $this->adminSeoPath('artist', $subject);
        $payload = ['seo' => [['locale' => 'az', 'title' => 'X']]];

        $this->putJson($path, $payload)->assertStatus(401);
        $this->actingAs(User::factory()->create(['username' => 'no.role']))->putJson($path, $payload)->assertForbidden();
        $this->assertSame(0, SeoMetadata::query()->count());
    }
}
