<?php

namespace Tests\Feature\Api;

use App\Models\EnquirySubject;
use Database\Seeders\EnquirySubjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnquirySubjectsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_the_six_public_subjects_in_order_excluding_other(): void
    {
        $this->seed(EnquirySubjectSeeder::class);

        $response = $this->getJson('/api/v1/enquiry-subjects');

        $response->assertOk();
        $response->assertExactJson(['data' => [
            ['key' => 'buy', 'label' => 'Əsər almaq'],
            ['key' => 'general_contact', 'label' => 'Ümumi əlaqə'],
            ['key' => 'artist_submission', 'label' => 'Rəssam müraciəti'],
            ['key' => 'media', 'label' => 'Media sorğusu'],
            ['key' => 'exhibition_invitation', 'label' => 'Sərgi / dəvət'],
            ['key' => 'collaboration', 'label' => 'Əməkdaşlıq'],
        ]]);
    }

    public function test_returns_english_labels_when_locale_is_en(): void
    {
        $this->seed(EnquirySubjectSeeder::class);

        $response = $this->getJson('/api/v1/enquiry-subjects?locale=en');

        $response->assertOk();
        $response->assertJsonFragment(['key' => 'media', 'label' => 'Media enquiry']);
    }

    public function test_excludes_an_inactive_subject(): void
    {
        $this->seed(EnquirySubjectSeeder::class);
        EnquirySubject::query()->where('key', 'collaboration')->update(['is_active' => false]);

        $response = $this->getJson('/api/v1/enquiry-subjects');

        $response->assertOk();
        $keys = array_column($response->json('data'), 'key');
        $this->assertNotContains('collaboration', $keys);
        $this->assertCount(5, $keys);
    }
}
