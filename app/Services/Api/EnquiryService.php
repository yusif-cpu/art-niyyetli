<?php

namespace App\Services\Api;

use App\Mail\NewEnquiryReceived;
use App\Models\Artwork;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use App\Services\Admin\SiteSettingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EnquiryService
{
    public function __construct(private SiteSettingService $settings) {}

    public function createFromPublicSubmission(?Artwork $artwork, array $data, ?string $ip, ?string $userAgent): Enquiry
    {
        $enquiry = DB::transaction(function () use ($artwork, $data, $ip, $userAgent) {
            $subject = EnquirySubject::query()->firstOrCreate(
                ['key' => $data['subject'] ?? 'buy'],
                ['sort_order' => 0, 'is_active' => true]
            );

            return Enquiry::query()->create([
                'enquiry_subject_id' => $subject->id,
                'artwork_id' => $artwork?->id,
                'inventory_code' => $artwork?->inventory_code,
                'submitted_at' => now(),
                'name' => $data['name'],
                'contact' => $data['email'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'message' => $data['message'],
                'status' => 'new',
                'meta' => null,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
            ]);
        });

        $this->sendNotification($enquiry);

        return $enquiry;
    }

    private function sendNotification(Enquiry $enquiry): void
    {
        $recipient = $this->settings->all()['contact_email'] ?? config('gallery.enquiry_notification_email');

        if (! $recipient) {
            Log::warning('Enquiry notification skipped: no recipient configured.', ['enquiry_id' => $enquiry->id]);

            return;
        }

        try {
            Mail::to($recipient)->send(new NewEnquiryReceived($enquiry->load('artwork.translations', 'subject.translations')));
        } catch (\Throwable $e) {
            Log::error('Enquiry notification failed to send.', ['enquiry_id' => $enquiry->id, 'error' => $e->getMessage()]);
        }
    }
}
