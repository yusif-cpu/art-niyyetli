<?php

namespace App\Services\Api;

use App\Jobs\SendEnquiryNotification;
use App\Models\Artwork;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use Illuminate\Support\Facades\DB;

class EnquiryService
{
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

        // The enquiry is committed above. The notification (recipient lookup, rendering, SMTP) runs after the response
        // has been sent, so the visitor never waits for the mail server and a mail failure can neither change the
        // response nor undo the enquiry.
        SendEnquiryNotification::dispatch($enquiry->id)->afterResponse();

        return $enquiry;
    }
}
