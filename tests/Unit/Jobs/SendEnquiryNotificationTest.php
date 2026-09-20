<?php

namespace Tests\Unit\Jobs;

use App\Jobs\SendEnquiryNotification;
use App\Mail\NewEnquiryReceived;
use App\Models\Artwork;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use App\Models\SiteSetting;
use App\Services\Admin\SiteSettingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Tests\TestCase;

class SendEnquiryNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function enquiry(string $subjectKey = 'buy'): Enquiry
    {
        $artwork = Artwork::factory()->create();
        $subject = EnquirySubject::query()->create(['key' => $subjectKey, 'sort_order' => 0, 'is_active' => true]);

        return Enquiry::query()->create([
            'enquiry_subject_id' => $subject->id, 'artwork_id' => $subjectKey === 'buy' ? $artwork->id : null,
            'inventory_code' => $subjectKey === 'buy' ? $artwork->inventory_code : null, 'submitted_at' => now(),
            'name' => 'Aysel Məmmədova', 'contact' => 'aysel@example.com', 'email' => 'aysel@example.com',
            'message' => 'Salam', 'status' => 'new',
        ]);
    }

    private function notify(Enquiry|int $enquiry): void
    {
        (new SendEnquiryNotification($enquiry instanceof Enquiry ? $enquiry->id : $enquiry))->handle(app(SiteSettingService::class));
    }

    public function test_it_is_deliberately_not_a_queued_job(): void
    {
        // On QUEUE_CONNECTION=database with no worker (none is provisioned) a queued job would wait in the jobs table
        // forever and the notification would never be sent. If this ever becomes a queued job, a worker must ship with it.
        $this->assertNotInstanceOf(ShouldQueue::class, new SendEnquiryNotification(1));
    }

    public function test_it_carries_only_the_enquiry_id(): void
    {
        $job = new SendEnquiryNotification(42);

        $this->assertSame(['enquiryId' => 42], get_object_vars($job));
    }

    public function test_it_mails_the_contact_email_setting_with_the_enquiry_and_its_relations_loaded(): void
    {
        Mail::fake();
        SiteSetting::query()->create(['key' => 'contact_email', 'value' => 'gallery@example.com', 'type' => 'string']);
        config(['gallery.enquiry_notification_email' => 'fallback@example.com']);

        $this->notify($this->enquiry());

        Mail::assertSent(NewEnquiryReceived::class, fn (NewEnquiryReceived $mail) => $mail->hasTo('gallery@example.com')
            && $mail->enquiry->email === 'aysel@example.com'
            && $mail->enquiry->relationLoaded('artwork')
            && $mail->enquiry->relationLoaded('subject'));
        Mail::assertNotSent(NewEnquiryReceived::class, fn ($mail) => $mail->hasTo('fallback@example.com'));
    }

    public function test_it_falls_back_to_the_configured_notification_address(): void
    {
        Mail::fake();
        config(['gallery.enquiry_notification_email' => 'fallback@example.com']);

        $this->notify($this->enquiry('general_contact'));

        Mail::assertSent(NewEnquiryReceived::class, fn ($mail) => $mail->hasTo('fallback@example.com'));
    }

    public function test_it_renders_the_branded_template_with_the_same_subject_as_before(): void
    {
        config(['gallery.enquiry_notification_email' => 'gallery@example.com']);
        $enquiry = $this->enquiry();

        $this->notify($enquiry);

        $message = Mail::getSymfonyTransport()->messages()->last()->getOriginalMessage();
        $this->assertSame('Yeni sorğu: '.$enquiry->inventory_code, $message->getSubject());
        $this->assertSame('gallery@example.com', $message->getTo()[0]->getAddress());
        $this->assertSame('aysel@example.com', $message->getReplyTo()[0]->getAddress());
        $this->assertStringContainsString('Aysel Məmmədova', (string) $message->getHtmlBody());
    }

    public function test_it_logs_a_warning_and_sends_nothing_without_a_recipient(): void
    {
        Mail::fake();
        Log::spy();
        config(['gallery.enquiry_notification_email' => null]);
        $enquiry = $this->enquiry();

        $this->notify($enquiry);

        Mail::assertNothingSent();
        Log::shouldHaveReceived('warning')->with('Enquiry notification skipped: no recipient configured.', ['enquiry_id' => $enquiry->id])->once();
    }

    public function test_an_enquiry_deleted_before_the_mail_is_sent_is_skipped_without_an_error(): void
    {
        Mail::fake();
        Log::spy();
        config(['gallery.enquiry_notification_email' => 'gallery@example.com']);

        $this->notify(999999);

        Mail::assertNothingSent();
        Log::shouldHaveReceived('warning')->with('Enquiry notification skipped: the enquiry no longer exists.', ['enquiry_id' => 999999])->once();
        Log::shouldNotHaveReceived('error');
    }

    public function test_a_transport_failure_is_logged_with_the_enquiry_id_and_never_rethrown(): void
    {
        Log::spy();
        config(['gallery.enquiry_notification_email' => 'gallery@example.com']);
        Mail::shouldReceive('to')->once()->andThrow(new RuntimeException('Connection timed out after 10 seconds'));
        $enquiry = $this->enquiry();

        $this->notify($enquiry); // must not throw

        Log::shouldHaveReceived('error')->with('Enquiry notification failed to send.', ['enquiry_id' => $enquiry->id, 'error' => 'Connection timed out after 10 seconds'])->once();
        $this->assertDatabaseHas('enquiries', ['id' => $enquiry->id, 'status' => 'new']);
    }

    public function test_a_failure_while_resolving_the_recipient_is_also_contained(): void
    {
        Log::spy();
        $settings = \Mockery::mock(SiteSettingService::class);
        $settings->shouldReceive('all')->andThrow(new RuntimeException('database went away'));

        (new SendEnquiryNotification(7))->handle($settings); // must not throw

        Log::shouldHaveReceived('error')->with('Enquiry notification failed to send.', ['enquiry_id' => 7, 'error' => 'database went away'])->once();
    }
}
