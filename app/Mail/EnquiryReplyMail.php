<?php

namespace App\Mail;

use App\Models\Enquiry;
use App\Services\Admin\SiteSettingService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EnquiryReplyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Enquiry $enquiry, public string $replySubject, public string $replyMessage) {}

    public function build(): self
    {
        $mail = $this->subject($this->replySubject)
            ->view('emails.enquiry-reply')
            ->with([
                'enquiry' => $this->enquiry,
                'body' => $this->replyMessage,
            ]);

        $contactEmail = app(SiteSettingService::class)->all()['contact_email'];

        if (filled($contactEmail)) {
            $mail->replyTo($contactEmail);
        }

        return $mail;
    }
}
