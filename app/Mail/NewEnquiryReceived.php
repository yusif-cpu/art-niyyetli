<?php

namespace App\Mail;

use App\Enums\Locale;
use App\Models\Enquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewEnquiryReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Enquiry $enquiry) {}

    public function build(): self
    {
        $subjectLine = $this->enquiry->subject->key === 'buy'
            ? 'Yeni sorğu: '.$this->enquiry->inventory_code
            : 'Yeni sorğu: '.$this->enquiry->subject->translations->firstWhere('locale', Locale::Az)?->name;

        $mail = $this->subject($subjectLine)
            ->view('emails.new-enquiry')
            ->with([
                'enquiry' => $this->enquiry,
                'adminUrl' => rtrim(config('app.url'), '/').'/admin#enquiries',
            ]);

        if (filled($this->enquiry->email)) {
            $mail->replyTo($this->enquiry->email);
        }

        return $mail;
    }
}
