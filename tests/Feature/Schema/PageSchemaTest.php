<?php

namespace Tests\Feature\Schema;

use App\Models\FaqTranslation;
use App\Models\Page;
use App\Models\PageSection;
use App\Models\PageSectionTranslation;
use App\Models\PageTranslation;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_with_sections_and_faqs_can_be_created_and_queried(): void
    {
        $page = Page::create(['type' => 'about']);
        PageTranslation::create(['page_id' => $page->id, 'locale' => 'az', 'slug' => 'haqqimizda', 'title' => 'Haqqımızda', 'content' => 'mətn']);

        $section = $page->sections()->create(['key' => 'intro', 'sort_order' => 0]);
        PageSectionTranslation::create(['page_section_id' => $section->id, 'locale' => 'az', 'heading' => 'Giriş', 'body' => 'mətn']);

        $faq = $page->faqs()->create(['sort_order' => 0]);
        FaqTranslation::create(['faq_id' => $faq->id, 'locale' => 'az', 'question' => 'Sual?', 'answer' => 'Cavab.']);

        $this->assertCount(1, $page->fresh()->sections);
        $this->assertCount(1, $page->fresh()->faqs);
    }

    public function test_duplicate_section_key_on_same_page_is_rejected(): void
    {
        $page = Page::create(['type' => 'about']);
        PageSection::create(['page_id' => $page->id, 'key' => 'intro']);

        $this->expectException(QueryException::class);
        PageSection::create(['page_id' => $page->id, 'key' => 'intro']);
    }

    public function test_duplicate_slug_per_locale_on_page_translations_is_rejected(): void
    {
        $page1 = Page::create(['type' => 'about']);
        $page2 = Page::create(['type' => 'contact']);

        PageTranslation::create(['page_id' => $page1->id, 'locale' => 'az', 'slug' => 'haqqimizda', 'title' => 'A', 'content' => 'x']);

        $this->expectException(QueryException::class);
        PageTranslation::create(['page_id' => $page2->id, 'locale' => 'az', 'slug' => 'haqqimizda', 'title' => 'B', 'content' => 'y']);
    }
}
