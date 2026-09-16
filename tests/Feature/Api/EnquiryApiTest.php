<?php

namespace Tests\Feature\Api;

use App\Mail\NewEnquiryReceived;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EnquiryApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeArtwork(array $overrides = []): Artwork
    {
        $artist = $overrides['artist_id'] ?? Artist::factory()->create()->id;
        $genre = $overrides['genre_id'] ?? Genre::factory()->create(['slug' => 'genre-'.uniqid()])->id;
        $medium = $overrides['medium_id'] ?? Medium::factory()->create(['slug' => 'medium-'.uniqid()])->id;

        return Artwork::factory()->create(array_merge([
            'artist_id' => $artist,
            'genre_id' => $genre,
            'medium_id' => $medium,
            'is_active' => true,
        ], $overrides));
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Aysel Məmmədova',
            'email' => 'aysel@example.com',
            'phone' => '+994501234567',
            'message' => 'Bu əsər haqqında məlumat almaq istəyirəm.',
        ], $overrides);
    }

    public function test_valid_submission_creates_enquiry_and_sends_notification(): void
    {
        Mail::fake();
        config(['gallery.enquiry_notification_email' => 'gallery@example.com']);
        $artwork = $this->makeArtwork();

        $response = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => $artwork->inventory_code]));

        $response->assertStatus(201);
        $response->assertExactJson(['message' => 'Sorğunuz qeydə alındı.']);
        $this->assertDatabaseHas('enquiries', ['artwork_id' => $artwork->id, 'status' => 'new', 'email' => 'aysel@example.com']);
        Mail::assertSent(NewEnquiryReceived::class);
    }

    public function test_missing_required_fields_returns_422(): void
    {
        $artwork = $this->makeArtwork();

        foreach (['name', 'email', 'message', 'artwork_code'] as $field) {
            $payload = $this->payload(['artwork_code' => $artwork->inventory_code]);
            unset($payload[$field]);

            $response = $this->postJson('/api/v1/enquiries', $payload);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors($field);
        }
    }

    public function test_invalid_email_format_returns_422(): void
    {
        $artwork = $this->makeArtwork();

        $response = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => $artwork->inventory_code, 'email' => 'not-an-email']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('email');
    }

    public function test_phone_over_max_length_returns_422(): void
    {
        $artwork = $this->makeArtwork();

        $response = $this->postJson('/api/v1/enquiries', $this->payload([
            'artwork_code' => $artwork->inventory_code,
            'phone' => str_repeat('1', 31),
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('phone');
    }

    public function test_message_over_max_length_returns_422(): void
    {
        $artwork = $this->makeArtwork();

        $response = $this->postJson('/api/v1/enquiries', $this->payload([
            'artwork_code' => $artwork->inventory_code,
            'message' => str_repeat('a', 5001),
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('message');
    }

    public function test_unknown_artwork_code_returns_422(): void
    {
        $response = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => 'DOES-NOT-EXIST']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('artwork_code');
    }

    public function test_inactive_artwork_code_returns_422(): void
    {
        $artwork = $this->makeArtwork(['is_active' => false]);

        $response = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => $artwork->inventory_code]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('artwork_code');
    }

    public function test_soft_deleted_artwork_code_returns_422(): void
    {
        $artwork = $this->makeArtwork();
        $artwork->delete();

        $response = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => $artwork->inventory_code]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('artwork_code');
    }

    public function test_unexpected_extra_field_returns_422(): void
    {
        $artwork = $this->makeArtwork();

        $response = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => $artwork->inventory_code, 'price' => 1]));

        $response->assertStatus(422);
    }

    public function test_honeypot_field_silently_fakes_success_without_persisting(): void
    {
        Mail::fake();
        $artwork = $this->makeArtwork();

        $response = $this->postJson('/api/v1/enquiries', $this->payload([
            'artwork_code' => $artwork->inventory_code,
            'website' => 'https://spambot.example.com',
        ]));

        $response->assertStatus(201);
        $response->assertExactJson(['message' => 'Sorğunuz qeydə alındı.']);
        $this->assertDatabaseCount('enquiries', 0);
        Mail::assertNothingSent();
    }

    public function test_response_never_leaks_internal_fields(): void
    {
        $artwork = $this->makeArtwork();

        $response = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => $artwork->inventory_code]));

        $body = $response->getContent();
        $this->assertStringNotContainsString('"id"', $body);
        $this->assertStringNotContainsString('"internal_note"', $body);
        $this->assertStringNotContainsString('"status"', $body);
    }

    public function test_sixth_request_within_an_hour_from_same_ip_is_rate_limited(): void
    {
        Mail::fake();
        $artwork = $this->makeArtwork();

        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => $artwork->inventory_code]));
            $response->assertStatus(201);
        }

        $sixth = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => $artwork->inventory_code]));

        $sixth->assertStatus(429);
        $this->assertDatabaseCount('enquiries', 5);
    }

    public function test_sold_artwork_rejected_by_default(): void
    {
        $artwork = $this->makeArtwork(['availability' => 'sold']);

        $response = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => $artwork->inventory_code]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('artwork_code');
    }

    public function test_sold_artwork_accepted_when_configured(): void
    {
        Mail::fake();
        config(['gallery.allow_sold_enquiries' => true]);
        $artwork = $this->makeArtwork(['availability' => 'sold']);

        $response = $this->postJson('/api/v1/enquiries', $this->payload(['artwork_code' => $artwork->inventory_code]));

        $response->assertStatus(201);
        $this->assertDatabaseHas('enquiries', ['artwork_id' => $artwork->id]);
    }
}
