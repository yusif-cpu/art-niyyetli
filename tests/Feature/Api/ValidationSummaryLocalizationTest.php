<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Laravel builds the top-level `message` of a 422 itself, from JSON-translated framework strings ("The given data was
 * invalid." when no error text is available, "(and N more errors)" after the first error). resources/lang/az/validation.php
 * only covers the per-field messages, so those summary strings stayed English on the Azerbaijani site until
 * resources/lang/az.json existed. The API contract (status, `errors` shape) is not touched.
 */
class ValidationSummaryLocalizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // A validation failure that carries no error text, which is the case that yields "The given data was invalid.".
        Route::post('/api/v1/__validation-without-messages', fn () => throw ValidationException::withMessages([]));
    }

    public function test_the_default_invalid_data_message_is_azerbaijani_for_az(): void
    {
        app()->setLocale('az');

        $response = $this->postJson('/api/v1/__validation-without-messages');

        $response->assertStatus(422);
        $this->assertSame('Daxil edilmiş məlumatlar etibarsızdır.', $response->json('message'));
        $this->assertStringNotContainsString('The given data was invalid.', $response->getContent());
    }

    public function test_the_default_invalid_data_message_stays_english_for_en(): void
    {
        app()->setLocale('en');

        $response = $this->postJson('/api/v1/__validation-without-messages');

        $response->assertStatus(422);
        $this->assertSame('The given data was invalid.', $response->json('message'));
    }

    public function test_the_more_errors_summary_of_a_real_endpoint_is_azerbaijani_for_az(): void
    {
        app()->setLocale('az');

        $response = $this->postJson('/api/v1/enquiries', []);

        $response->assertStatus(422);
        $this->assertSame(['name', 'email', 'message', 'subject'], array_keys($response->json('errors')));
        $this->assertStringEndsWith('(daha 3 xəta)', $response->json('message'));
        $this->assertStringNotContainsString('more error', $response->json('message'));
    }

    public function test_the_more_errors_summary_of_a_real_endpoint_stays_english_for_en(): void
    {
        app()->setLocale('en');

        $response = $this->postJson('/api/v1/enquiries', []);

        $response->assertStatus(422);
        $this->assertStringEndsWith('(and 3 more errors)', $response->json('message'));
    }

    public function test_a_single_remaining_error_uses_the_singular_key_in_both_locales(): void
    {
        $payload = ['name' => 'Aysel', 'email' => 'aysel@example.az', 'message' => 'Salam', 'subject' => 'general_contact', 'unexpected' => 'x'];

        app()->setLocale('az');
        $this->postJson('/api/v1/enquiries', array_merge($payload, ['email' => 'not-an-email']))->assertStatus(422)
            ->assertJsonPath('message', fn ($message) => str_ends_with($message, '(daha 1 xəta)'));

        app()->setLocale('en');
        $this->postJson('/api/v1/enquiries', array_merge($payload, ['email' => 'not-an-email']))->assertStatus(422)
            ->assertJsonPath('message', fn ($message) => str_ends_with($message, '(and 1 more error)'));
    }
}
