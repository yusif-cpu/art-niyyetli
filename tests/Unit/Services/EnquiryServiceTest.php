<?php

namespace Tests\Unit\Services;

use App\Mail\NewEnquiryReceived;
use App\Models\Artwork;
use App\Models\EnquirySubject;
use App\Models\SiteSetting;
use App\Services\Api\EnquiryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EnquiryServiceTest extends TestCase
{
    use RefreshDatabase;

    private function validData(): array
    {
        return [
            'name' => 'Aysel Məmmədova',
            'email' => 'aysel@example.com',
            'phone' => '+994501234567',
            'message' => 'Bu əsər haqqında məlumat almaq istəyirəm.',
        ];
    }

    public function test_creates_enquiry_and_resolves_buy_subject_without_seeder(): void
    {
        Mail::fake();
        $artwork = Artwork::factory()->create();

        $enquiry = app(EnquiryService::class)->createFromPublicSubmission($artwork, $this->validData(), '203.0.113.1', 'Mozilla/5.0');

        $this->assertDatabaseHas('enquiries', [
            'id' => $enquiry->id,
            'artwork_id' => $artwork->id,
            'inventory_code' => $artwork->inventory_code,
            'name' => 'Aysel Məmmədova',
            'email' => 'aysel@example.com',
            'phone' => '+994501234567',
            'status' => 'new',
            'ip_address' => '203.0.113.1',
        ]);

        $subject = EnquirySubject::query()->where('key', 'buy')->first();
        $this->assertNotNull($subject);
        $this->assertSame($subject->id, $enquiry->enquiry_subject_id);
    }

    public function test_sends_notification_when_contact_email_site_setting_present(): void
    {
        Mail::fake();
        $artwork = Artwork::factory()->create();
        SiteSetting::query()->create(['key' => 'contact_email', 'value' => 'gallery@example.com', 'type' => 'string']);

        app(EnquiryService::class)->createFromPublicSubmission($artwork, $this->validData(), null, null);

        Mail::assertSent(NewEnquiryReceived::class, fn ($mail) => $mail->hasTo('gallery@example.com'));
    }

    public function test_sends_notification_to_config_fallback_when_no_site_setting(): void
    {
        Mail::fake();
        config(['gallery.enquiry_notification_email' => 'fallback@example.com']);
        $artwork = Artwork::factory()->create();

        app(EnquiryService::class)->createFromPublicSubmission($artwork, $this->validData(), null, null);

        Mail::assertSent(NewEnquiryReceived::class, fn ($mail) => $mail->hasTo('fallback@example.com'));
    }

    public function test_skips_notification_silently_when_no_recipient_configured(): void
    {
        Mail::fake();
        config(['gallery.enquiry_notification_email' => null]);
        $artwork = Artwork::factory()->create();

        $enquiry = app(EnquiryService::class)->createFromPublicSubmission($artwork, $this->validData(), null, null);

        Mail::assertNothingSent();
        $this->assertDatabaseHas('enquiries', ['id' => $enquiry->id]);
    }

    public function test_mail_failure_does_not_roll_back_the_created_enquiry(): void
    {
        config(['gallery.enquiry_notification_email' => 'fallback@example.com']);
        Mail::shouldReceive('to')->andReturnUsing(function () {
            throw new \RuntimeException('SMTP connection refused');
        });
        $artwork = Artwork::factory()->create();

        $enquiry = app(EnquiryService::class)->createFromPublicSubmission($artwork, $this->validData(), null, null);

        $this->assertDatabaseHas('enquiries', ['id' => $enquiry->id, 'status' => 'new']);
    }
}
