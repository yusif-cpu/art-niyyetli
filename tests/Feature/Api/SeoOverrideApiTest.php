<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Seo\CreatesSeoSubjects;
use Tests\TestCase;

class SeoOverrideApiTest extends TestCase
{
    use CreatesSeoSubjects;
    use RefreshDatabase;

    #[DataProvider('seoKinds')]
    public function test_seo_is_null_without_an_override(string $kind): void
    {
        $subject = $this->makeSeoSubject($kind);

        $this->getJson($this->publicSeoUrl($kind, $subject))->assertOk()->assertJsonPath('data.seo', null);
    }

    #[DataProvider('seoKinds')]
    public function test_seo_returns_the_override_of_the_request_locale_only(string $kind): void
    {
        $subject = $this->makeSeoSubject($kind);
        $image = $this->makeSeoImage('seo/az.webp');
        $subject->seoMetadata()->create(['locale' => 'az', 'title' => 'AZ başlıq', 'description' => 'AZ təsvir', 'og_image_id' => $image->id]);
        $subject->seoMetadata()->create(['locale' => 'en', 'title' => 'EN title', 'description' => null, 'og_image_id' => null]);
        $url = $this->publicSeoUrl($kind, $subject);

        $this->getJson($url)->assertOk()->assertJsonPath('data.seo', [
            'title' => 'AZ başlıq',
            'description' => 'AZ təsvir',
            'image_url' => Storage::disk('public')->url('seo/az.webp'),
        ]);

        // EN carries only a title: the other keys are null, and nothing is borrowed from AZ.
        $this->getJson($url.'?locale=en')->assertJsonPath('data.seo', ['title' => 'EN title', 'description' => null, 'image_url' => null]);
    }

    #[DataProvider('seoKinds')]
    public function test_seo_is_null_when_the_request_locale_has_no_override(string $kind): void
    {
        $subject = $this->makeSeoSubject($kind);
        $subject->seoMetadata()->create(['locale' => 'az', 'title' => 'Yalnız AZ']);

        $this->getJson($this->publicSeoUrl($kind, $subject).'?locale=en')->assertOk()->assertJsonPath('data.seo', null);
    }

    public function test_the_page_list_does_not_carry_a_seo_key(): void
    {
        $page = $this->makeSeoSubject('page');
        $page->seoMetadata()->create(['locale' => 'az', 'title' => 'X']);

        $this->getJson('/api/v1/pages')->assertOk()->assertJsonMissingPath('data.0.seo');
    }
}
