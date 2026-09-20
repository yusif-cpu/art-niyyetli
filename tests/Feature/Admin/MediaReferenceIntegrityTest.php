<?php

namespace Tests\Feature\Admin;

use App\Models\Article;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Exhibition;
use App\Models\ExhibitionMedium;
use App\Models\Media;
use App\Models\Page;
use App\Models\PageSection;
use App\Models\Role;
use App\Models\SeoMetadata;
use App\Models\SiteSetting;
use App\Models\SocialLink;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * A media file that anything still points at must never be soft-deleted, or that record is left with a dangling
 * reference (Media is soft-deleted, so the database foreign keys never fire). There are exactly eight places that
 * reference media in this application: artwork images, artist portraits, exhibition media, article galleries,
 * page-section images, social-link logos, SEO images and the site logo setting.
 *
 * Owners that can be archived (artwork, artist, exhibition, article, page) keep their references while archived,
 * so an archived owner must block deletion too — restoring it would otherwise bring back a broken image.
 */
class MediaReferenceIntegrityTest extends TestCase
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

    private function deleteMedia(Media $media): TestResponse
    {
        return $this->actingAs($this->admin)->deleteJson("/admin/media/{$media->id}");
    }

    /** The delete is refused with a 409 that names the kind of record to detach from, and nothing is deleted. */
    private function assertBlocked(Media $media, string $kind): void
    {
        $response = $this->deleteMedia($media);

        $response->assertStatus(409);
        $this->assertStringContainsString($kind, $response->json('message'));
        $this->assertStringContainsString('Remove it from there first', $response->json('message'));
        $this->assertDatabaseHas('media', ['id' => $media->id, 'deleted_at' => null]);
    }

    private function assertDeletable(Media $media): void
    {
        $this->deleteMedia($media)->assertOk();
        $this->assertSoftDeleted('media', ['id' => $media->id]);
    }

    private function media(): Media
    {
        return Media::factory()->create();
    }

    // -- the three references that were not guarded before ---------------------------------------------------

    public function test_an_article_gallery_image_cannot_be_deleted_even_when_the_article_is_archived(): void
    {
        $media = $this->media();
        $article = Article::factory()->create();
        $article->media()->attach($media->id, ['sort_order' => 0]);

        $this->assertBlocked($media, 'an article');

        $article->delete(); // archived (soft-deleted): the gallery row is still there
        $this->assertBlocked($media, 'an article');

        $article->forceDelete(); // gone for good: the gallery rows go with it
        $this->assertDeletable($media);
    }

    public function test_a_page_section_image_cannot_be_deleted_even_when_the_page_is_archived(): void
    {
        $media = $this->media();
        $page = Page::factory()->create();
        $section = PageSection::factory()->create(['page_id' => $page->id, 'media_id' => $media->id]);

        $this->assertBlocked($media, 'a page section');

        $page->delete(); // archived page: its sections (and their images) remain
        $this->assertBlocked($media, 'a page section');

        $section->update(['media_id' => null]);
        $this->assertDeletable($media);
    }

    public function test_the_site_logo_cannot_be_deleted(): void
    {
        $media = $this->media();
        SiteSetting::query()->create(['key' => 'logo_media_id', 'value' => (string) $media->id, 'type' => 'string']);

        $this->assertBlocked($media, 'the site logo');

        SiteSetting::query()->where('key', 'logo_media_id')->update(['value' => '']);
        $this->assertDeletable($media);
    }

    public function test_only_the_exact_media_id_counts_as_the_site_logo(): void
    {
        // ids 1..N: the logo is media #2, so #1 and #12 must not be mistaken for it (no LIKE / prefix matching).
        $others = Media::factory()->count(12)->create();
        $logo = $others[1];
        SiteSetting::query()->create(['key' => 'logo_media_id', 'value' => (string) $logo->id, 'type' => 'string']);

        $this->assertBlocked($logo, 'the site logo');
        $this->assertDeletable($others[0]);
        $this->assertDeletable($others[11]);
    }

    public function test_an_unset_logo_setting_blocks_nothing(): void
    {
        SiteSetting::query()->create(['key' => 'logo_media_id', 'value' => '', 'type' => 'string']);

        $this->assertDeletable($this->media());
    }

    // -- the references that were already guarded, now including archived owners ------------------------------

    public function test_an_artwork_image_blocks_deletion_including_for_an_archived_artwork(): void
    {
        $media = $this->media();
        $artwork = Artwork::factory()->create();
        $artwork->images()->create(['media_id' => $media->id, 'type' => 'main', 'is_main' => true, 'sort_order' => 0]);

        $this->assertBlocked($media, 'an artwork');

        $artwork->delete();
        $this->assertBlocked($media, 'an artwork');

        $artwork->forceDelete();
        $this->assertDeletable($media);
    }

    public function test_an_artist_portrait_blocks_deletion_including_for_an_archived_artist(): void
    {
        $media = $this->media();
        $artist = Artist::factory()->create(['representation_image_id' => $media->id]);

        $this->assertBlocked($media, 'an artist');

        // Previously an archived artist no longer counted, so the portrait could be deleted out from under it.
        $artist->delete();
        $this->assertBlocked($media, 'an artist');

        $artist->forceDelete();
        $this->assertDeletable($media);
    }

    public function test_exhibition_media_blocks_deletion_including_for_an_archived_exhibition(): void
    {
        $media = $this->media();
        $exhibition = Exhibition::factory()->create();
        ExhibitionMedium::create(['exhibition_id' => $exhibition->id, 'media_id' => $media->id, 'type' => 'photo', 'sort_order' => 0]);

        $this->assertBlocked($media, 'an exhibition');

        $exhibition->delete();
        $this->assertBlocked($media, 'an exhibition');

        $exhibition->forceDelete();
        $this->assertDeletable($media);
    }

    public function test_a_social_link_logo_blocks_deletion(): void
    {
        $media = $this->media();
        $link = SocialLink::factory()->create(['logo_media_id' => $media->id]);

        $this->assertBlocked($media, 'a social link');

        $link->delete();
        $this->assertDeletable($media);
    }

    public function test_an_seo_image_blocks_deletion(): void
    {
        $media = $this->media();
        $seo = SeoMetadata::create([
            'seoable_type' => Artwork::class, 'seoable_id' => Artwork::factory()->create()->id,
            'locale' => 'az', 'title' => 'T', 'description' => 'D', 'og_image_id' => $media->id,
        ]);

        $this->assertBlocked($media, 'an SEO record');

        $seo->delete();
        $this->assertDeletable($media);
    }

    public function test_the_message_names_every_kind_of_record_that_still_uses_the_file(): void
    {
        $media = $this->media();
        Artwork::factory()->create()->images()->create(['media_id' => $media->id, 'type' => 'main', 'is_main' => true, 'sort_order' => 0]);
        Article::factory()->create()->media()->attach($media->id, ['sort_order' => 0]);
        SiteSetting::query()->create(['key' => 'logo_media_id', 'value' => (string) $media->id, 'type' => 'string']);

        $response = $this->deleteMedia($media)->assertStatus(409);

        $this->assertSame(
            'This media file is still used by an artwork, an article and the site logo and cannot be deleted. Remove it from there first.',
            $response->json('message')
        );
        $this->assertSame(['message'], array_keys($response->json()), 'the response shape is unchanged');
    }

    public function test_unreferenced_media_is_deleted_once_and_then_is_gone(): void
    {
        $media = $this->media();

        $this->assertDeletable($media);
        $this->deleteMedia($media)->assertStatus(404);
    }

    // -- through the real admin API ---------------------------------------------------------------------------

    public function test_setting_the_logo_through_the_api_protects_the_file_until_the_logo_is_cleared(): void
    {
        $media = $this->media();

        $this->actingAs($this->admin)->putJson('/admin/settings', ['logo_media_id' => $media->id])->assertOk();
        $this->assertBlocked($media, 'the site logo');

        $this->actingAs($this->admin)->putJson('/admin/settings', ['logo_media_id' => null])->assertOk();
        $this->assertDeletable($media);
    }

    public function test_attaching_a_page_section_image_through_the_api_protects_the_file(): void
    {
        $media = $this->media();
        $page = Page::factory()->create();

        $section = $this->actingAs($this->admin)->postJson("/admin/pages/{$page->id}/sections", [
            'key' => 'hero', 'media_id' => $media->id, 'is_active' => true,
            'translations' => [['locale' => 'az', 'heading' => 'H', 'body' => 'B']],
        ])->assertOk()->json('data.id');

        $this->assertBlocked($media, 'a page section');

        $this->actingAs($this->admin)->putJson("/admin/pages/sections/{$section}", [
            'key' => 'hero', 'media_id' => null, 'is_active' => true,
            'translations' => [['locale' => 'az', 'heading' => 'H', 'body' => 'B']],
        ])->assertOk();
        $this->assertDeletable($media);
    }

    public function test_attaching_an_article_gallery_image_through_the_api_protects_the_file(): void
    {
        $media = $this->media();
        $article = Article::factory()->create();

        $this->actingAs($this->admin)->putJson("/admin/articles/{$article->id}", ['media' => [['media_id' => $media->id, 'sort_order' => 0]]])->assertOk();
        $this->assertBlocked($media, 'an article');

        $this->actingAs($this->admin)->putJson("/admin/articles/{$article->id}", ['media' => []])->assertOk();
        $this->assertDeletable($media);
    }

    // -- soft-deleted media can never be attached again --------------------------------------------------------

    public function test_deleted_media_cannot_be_attached_through_any_admin_endpoint(): void
    {
        $gone = $this->media();
        $this->assertDeletable($gone);

        $page = Page::factory()->create();
        $link = SocialLink::factory()->create();
        $artist = Artist::factory()->create();
        $article = Article::factory()->create();
        $artwork = Artwork::factory()->create();
        $exhibition = Exhibition::factory()->create();

        $attempts = [
            'page section image' => ['post', "/admin/pages/{$page->id}/sections", [
                'key' => 'hero', 'media_id' => $gone->id, 'is_active' => true,
                'translations' => [['locale' => 'az', 'heading' => 'H', 'body' => 'B']],
            ], 'media_id'],
            'site logo' => ['put', '/admin/settings', ['logo_media_id' => $gone->id], 'logo_media_id'],
            'social link logo' => ['put', "/admin/social-links/{$link->id}", ['logo_media_id' => $gone->id], 'logo_media_id'],
            'artist portrait' => ['put', "/admin/artists/{$artist->id}", ['representation_image_id' => $gone->id], 'representation_image_id'],
            'article gallery' => ['put', "/admin/articles/{$article->id}", ['media' => [['media_id' => $gone->id, 'sort_order' => 0]]], 'media.0.media_id'],
            'artwork image' => ['put', "/admin/artworks/{$artwork->id}", ['images' => [['media_id' => $gone->id, 'type' => 'main', 'is_main' => true, 'sort_order' => 0]]], 'images.0.media_id'],
            'exhibition media' => ['put', "/admin/exhibitions/{$exhibition->id}", ['media' => [['media_id' => $gone->id, 'type' => 'photo', 'sort_order' => 0]]], 'media.0.media_id'],
        ];

        foreach ($attempts as $label => [$method, $uri, $payload, $errorKey]) {
            $this->actingAs($this->admin)->{$method.'Json'}($uri, $payload)
                ->assertStatus(422)
                ->assertJsonValidationErrors([$errorKey]);
        }
    }
}
