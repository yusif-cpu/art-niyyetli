<?php

namespace Tests\Feature\Api;

use App\Jobs\SendEnquiryNotification;
use App\Mail\EnquiryReplyMail;
use App\Mail\NewEnquiryReceived;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use App\Services\Api\EnquiryService;
use Illuminate\Foundation\Http\Events\RequestHandled;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use RuntimeException;
use Tests\Support\ManipulatesEnvironment;
use Tests\TestCase;

/**
 * Phase 12 Task 10 (S-09): the new-enquiry notification email is sent after the visitor's response, so the response
 * never waits for SMTP — while the enquiry response, the enquiry itself, validation, the honeypot, the rate limit
 * and the admin reply are exactly as before.
 *
 * tests/TestCase.php normally runs work dispatched ->afterResponse() at dispatch time; every test here that is about
 * the deferral itself opts back in with Bus::withDispatchingAfterResponses().
 */
class EnquiryNotificationDeferralTest extends TestCase
{
    use ManipulatesEnvironment, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['gallery.enquiry_notification_email' => 'gallery@example.com']);
    }

    protected function tearDown(): void
    {
        $this->restoreEnvironment();

        parent::tearDown();
    }

    private function artwork(): Artwork
    {
        return Artwork::factory()->create([
            'artist_id' => Artist::factory()->create()->id,
            'genre_id' => Genre::factory()->create(['slug' => 'genre-'.uniqid()])->id,
            'medium_id' => Medium::factory()->create(['slug' => 'medium-'.uniqid()])->id,
            'is_active' => true,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Aysel Məmmədova', 'email' => 'aysel@example.com', 'phone' => '+994501234567',
            'message' => 'Bu əsər haqqında məlumat almaq istəyirəm.', 'subject' => 'general_contact',
        ], $overrides);
    }

    // -- The response does not wait for the mail -----------------------------

    public function test_the_response_is_ready_before_the_mail_is_sent_and_the_enquiry_is_already_saved(): void
    {
        Bus::withDispatchingAfterResponses();
        $order = [];
        $rowsWhenResponseReady = null;

        // RequestHandled fires when the kernel has the response in hand — in production this is right before the response
        // is flushed to the visitor (and terminate(), where deferred work runs, comes after that).
        Event::listen(RequestHandled::class, function () use (&$order, &$rowsWhenResponseReady) {
            $order[] = 'response ready';
            $rowsWhenResponseReady = DB::table('enquiries')->count();
        });
        Mail::shouldReceive('to')->once()->with('gallery@example.com')->andReturnUsing(function () use (&$order) {
            $order[] = 'smtp send starts';

            return new class
            {
                public function send($mailable): void {}
            };
        });

        $this->postJson('/api/v1/enquiries', $this->payload())
            ->assertStatus(201)
            ->assertExactJson(['message' => 'Sorğunuz qeydə alındı.']);

        $this->assertSame(['response ready', 'smtp send starts'], $order, 'SMTP must not start until the response is ready');
        $this->assertSame(1, $rowsWhenResponseReady, 'the enquiry is committed before the response, and before any mail');
    }

    public function test_the_mail_is_sent_exactly_once_after_the_response_with_the_same_recipient_and_reply_to(): void
    {
        Bus::withDispatchingAfterResponses();
        Mail::fake();
        $sentWhenResponseReady = null;
        Event::listen(RequestHandled::class, function () use (&$sentWhenResponseReady) {
            $sentWhenResponseReady = Mail::sent(NewEnquiryReceived::class)->count();
        });

        $this->postJson('/api/v1/enquiries', $this->payload())->assertStatus(201);

        $this->assertSame(0, $sentWhenResponseReady);
        Mail::assertSent(NewEnquiryReceived::class, 1);
        Mail::assertSent(NewEnquiryReceived::class, function (NewEnquiryReceived $mail) {
            return $mail->hasTo('gallery@example.com')
                && $mail->enquiry->email === 'aysel@example.com'
                && $mail->enquiry->subject->key === 'general_contact'
                && $mail->enquiry->relationLoaded('subject');
        });
    }

    public function test_the_delivered_message_keeps_its_subject_reply_to_and_branded_template(): void
    {
        // No Mail::fake(): the array mailer records the real, rendered message.
        Bus::withDispatchingAfterResponses();

        $this->postJson('/api/v1/enquiries', $this->payload())->assertStatus(201);

        $message = Mail::getSymfonyTransport()->messages()->last()->getOriginalMessage();
        $this->assertSame('gallery@example.com', $message->getTo()[0]->getAddress());
        $this->assertSame('aysel@example.com', $message->getReplyTo()[0]->getAddress());
        $this->assertSame(config('mail.from.address'), $message->getFrom()[0]->getAddress());
        $this->assertStringStartsWith('Yeni sorğu: ', $message->getSubject());
        $this->assertStringContainsString('Aysel Məmmədova', (string) $message->getHtmlBody());
    }

    public function test_a_service_call_defers_the_mail_until_terminate(): void
    {
        Bus::withDispatchingAfterResponses();
        Mail::fake();

        $enquiry = app(EnquiryService::class)->createFromPublicSubmission(null, $this->payload(), null, null);

        $this->assertDatabaseHas('enquiries', ['id' => $enquiry->id]);
        Mail::assertNothingSent();

        $this->app->terminate();

        Mail::assertSent(NewEnquiryReceived::class, 1);
    }

    public function test_the_notification_is_dispatched_after_the_response_carrying_only_the_enquiry_id(): void
    {
        Bus::fake();

        $this->postJson('/api/v1/enquiries', $this->payload())->assertStatus(201);

        $enquiry = Enquiry::query()->firstOrFail();
        Bus::assertDispatchedAfterResponse(SendEnquiryNotification::class, fn (SendEnquiryNotification $job) => $job->enquiryId === $enquiry->id);
        Bus::assertDispatchedTimes(SendEnquiryNotification::class, 1);
    }

    public function test_nothing_is_ever_pushed_onto_the_queue_because_no_worker_would_run_it(): void
    {
        Mail::fake();
        config(['queue.default' => 'database']);
        Queue::fake();

        $this->postJson('/api/v1/enquiries', $this->payload())->assertStatus(201);

        Queue::assertNothingPushed();
        $this->assertSame(0, DB::table('jobs')->count(), 'a job left in the jobs table would never be sent');
        Mail::assertSent(NewEnquiryReceived::class, 1);
    }

    // -- Failure handling ----------------------------------------------------

    public function test_a_mail_failure_after_the_response_is_logged_and_changes_nothing(): void
    {
        Bus::withDispatchingAfterResponses();
        Log::spy();
        Mail::shouldReceive('to')->once()->andThrow(new RuntimeException('SMTP connection refused'));

        $response = $this->postJson('/api/v1/enquiries', $this->payload());

        $response->assertStatus(201)->assertExactJson(['message' => 'Sorğunuz qeydə alındı.']);
        $enquiry = Enquiry::query()->firstOrFail();
        $this->assertSame('new', $enquiry->status->value);
        Log::shouldHaveReceived('error')->with('Enquiry notification failed to send.', ['enquiry_id' => $enquiry->id, 'error' => 'SMTP connection refused'])->once();
    }

    public function test_a_mail_failure_does_not_consume_or_block_the_next_enquiry(): void
    {
        Log::spy();
        Mail::shouldReceive('to')->twice()->andThrow(new RuntimeException('SMTP down'));

        $this->postJson('/api/v1/enquiries', $this->payload(['email' => 'one@example.com']))->assertStatus(201);
        $this->postJson('/api/v1/enquiries', $this->payload(['email' => 'two@example.com']))->assertStatus(201);

        $this->assertSame(['one@example.com', 'two@example.com'], Enquiry::query()->orderBy('id')->pluck('email')->all());
    }

    public function test_no_recipient_configured_saves_the_enquiry_warns_and_sends_nothing(): void
    {
        Bus::withDispatchingAfterResponses();
        config(['gallery.enquiry_notification_email' => null]);
        Mail::fake();
        Log::spy();

        $this->postJson('/api/v1/enquiries', $this->payload())->assertStatus(201);

        Mail::assertNothingSent();
        $this->assertDatabaseCount('enquiries', 1);
        Log::shouldHaveReceived('warning')->with('Enquiry notification skipped: no recipient configured.', ['enquiry_id' => Enquiry::query()->value('id')])->once();
    }

    // -- Unchanged behaviour: nothing is dispatched unless an enquiry was saved ----

    public function test_validation_failures_the_honeypot_and_unknown_artworks_dispatch_nothing(): void
    {
        Bus::fake();

        $this->postJson('/api/v1/enquiries', [])->assertStatus(422);
        $this->postJson('/api/v1/enquiries', $this->payload(['email' => 'not-an-email']))->assertStatus(422);
        $this->postJson('/api/v1/enquiries', $this->payload(['subject' => 'buy', 'artwork_code' => 'AN-DOES-NOT-EXIST']))->assertStatus(422);
        $this->postJson('/api/v1/enquiries', $this->payload(['website' => 'https://spam.example']))
            ->assertStatus(201)
            ->assertExactJson(['message' => 'Sorğunuz qeydə alındı.']);

        Bus::assertNothingDispatched();
        $this->assertDatabaseCount('enquiries', 0);
    }

    public function test_the_rate_limit_is_unchanged_and_a_throttled_request_dispatches_nothing(): void
    {
        Bus::fake();

        foreach (range(1, 5) as $ignored) {
            $this->postJson('/api/v1/enquiries', $this->payload())->assertStatus(201);
        }
        $this->postJson('/api/v1/enquiries', $this->payload())->assertStatus(429);

        Bus::assertDispatchedTimes(SendEnquiryNotification::class, 5);
        $this->assertDatabaseCount('enquiries', 5);
    }

    public function test_the_admin_reply_stays_synchronous_and_is_not_deferred(): void
    {
        $this->withoutMiddleware(PreventRequestForgery::class);
        Bus::fake();
        Mail::fake();
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
        $artwork = $this->artwork();
        $enquiry = Enquiry::query()->create([
            'enquiry_subject_id' => EnquirySubject::query()->create(['key' => 'buy', 'sort_order' => 0, 'is_active' => true])->id,
            'artwork_id' => $artwork->id, 'inventory_code' => $artwork->inventory_code, 'submitted_at' => now(),
            'name' => 'Aysel', 'contact' => 'aysel@example.com', 'email' => 'aysel@example.com', 'message' => 'Salam', 'status' => 'new',
        ]);

        $this->actingAs($admin)->postJson("/admin/enquiries/{$enquiry->id}/reply", ['subject' => 'Re: sorğu', 'message' => 'Cavab'])->assertSuccessful();

        Mail::assertSent(EnquiryReplyMail::class, 1);
        Bus::assertNothingDispatched();
    }

    // -- Configuration -------------------------------------------------------

    public function test_the_smtp_timeout_defaults_to_ten_seconds_and_is_tunable(): void
    {
        $timeout = fn (?string $value) => $this->configFileWith('mail', ['MAIL_TIMEOUT' => $value])['mailers']['smtp']['timeout'];

        $this->assertSame(10, $timeout(null));
        $this->assertSame(5, $timeout('5'));
        $this->assertSame(30, $timeout('30'));
        foreach (['', '0', '-3', 'abc'] as $bad) {
            $this->assertSame(10, $timeout($bad), "value [{$bad}] falls back to the default");
        }
    }

    public function test_the_configured_timeout_reaches_the_smtp_transport(): void
    {
        config(['mail.mailers.smtp.timeout' => 7, 'mail.default' => 'smtp']);
        app('mail.manager')->purge('smtp');

        $stream = app('mail.manager')->mailer('smtp')->getSymfonyTransport()->getStream();

        $reflection = new \ReflectionProperty($stream, 'timeout');
        $this->assertSame(7.0, (float) $reflection->getValue($stream));
    }
}
