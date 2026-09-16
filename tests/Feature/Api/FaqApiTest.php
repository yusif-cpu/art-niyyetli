<?php

namespace Tests\Feature\Api;

use App\Models\Faq;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FaqApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_only_active_faqs_ordered_by_sort_order(): void
    {
        $page = Page::factory()->create();

        $first = Faq::factory()->create(['page_id' => $page->id, 'sort_order' => 1, 'is_active' => true]);
        $first->translations()->create(['locale' => 'az', 'question' => 'Sual 1', 'answer' => 'Cavab 1']);

        $second = Faq::factory()->create(['page_id' => $page->id, 'sort_order' => 0, 'is_active' => true]);
        $second->translations()->create(['locale' => 'az', 'question' => 'Sual 0', 'answer' => 'Cavab 0']);

        $hidden = Faq::factory()->create(['page_id' => $page->id, 'sort_order' => 2, 'is_active' => false]);
        $hidden->translations()->create(['locale' => 'az', 'question' => 'Hidden', 'answer' => 'Hidden']);

        $response = $this->getJson('/api/v1/faqs');

        $response->assertOk();
        $questions = collect($response->json('data'))->pluck('question')->all();
        $this->assertSame(['Sual 0', 'Sual 1'], $questions);
    }

    public function test_locale_en_falls_back_to_az_per_field(): void
    {
        $page = Page::factory()->create();
        $faq = Faq::factory()->create(['page_id' => $page->id, 'is_active' => true]);
        $faq->translations()->create(['locale' => 'az', 'question' => 'AZ Sual', 'answer' => 'AZ Cavab']);
        $faq->translations()->create(['locale' => 'en', 'question' => '', 'answer' => 'EN Answer']);

        $response = $this->getJson('/api/v1/faqs?locale=en');

        $response->assertOk();
        $item = $response->json('data.0');
        $this->assertSame('AZ Sual', $item['question']);
        $this->assertSame('EN Answer', $item['answer']);
    }

    public function test_invalid_locale_behaves_like_default(): void
    {
        $page = Page::factory()->create();
        $faq = Faq::factory()->create(['page_id' => $page->id, 'is_active' => true]);
        $faq->translations()->create(['locale' => 'az', 'question' => 'AZ Sual', 'answer' => 'AZ Cavab']);

        $withInvalid = $this->getJson('/api/v1/faqs?locale=xx')->json('data.0.question');
        $withoutParam = $this->getJson('/api/v1/faqs')->json('data.0.question');

        $this->assertSame($withoutParam, $withInvalid);
        $this->assertSame('AZ Sual', $withInvalid);
    }
}
