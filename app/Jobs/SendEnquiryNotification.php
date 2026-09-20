<?php

namespace App\Jobs;

use App\Mail\NewEnquiryReceived;
use App\Models\Enquiry;
use App\Services\Admin\SiteSettingService;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Emails the gallery about a new public enquiry.
 *
 * Dispatched with ->afterResponse() (see EnquiryService), so it runs in the same PHP process once the visitor's
 * response has been flushed: the visitor never waits for SMTP, and — unlike a queued job — no queue worker is needed
 * (none is provisioned). It deliberately does NOT implement ShouldQueue: a queued job on the `database` queue would sit
 * in the `jobs` table forever and the notification would never be sent. It carries only the enquiry id, so it stays
 * trivially serializable if it is ever turned into a real queued job (add ShouldQueue and run a worker — Phase 13).
 *
 * A failure is logged and never rethrown: the enquiry is already saved and visible in the admin inbox, and the
 * visitor's response has already been sent.
 */
class SendEnquiryNotification
{
    use Dispatchable;

    public function __construct(public int $enquiryId) {}

    public function handle(SiteSettingService $settings): void
    {
        try {
            $recipient = $settings->all()['contact_email'] ?? config('gallery.enquiry_notification_email');

            if (! $recipient) {
                Log::warning('Enquiry notification skipped: no recipient configured.', ['enquiry_id' => $this->enquiryId]);

                return;
            }

            $enquiry = Enquiry::query()->with('artwork.translations', 'subject.translations')->find($this->enquiryId);

            if (! $enquiry) {
                Log::warning('Enquiry notification skipped: the enquiry no longer exists.', ['enquiry_id' => $this->enquiryId]);

                return;
            }

            Mail::to($recipient)->send(new NewEnquiryReceived($enquiry));
        } catch (Throwable $e) {
            Log::error('Enquiry notification failed to send.', ['enquiry_id' => $this->enquiryId, 'error' => $e->getMessage()]);
        }
    }
}
