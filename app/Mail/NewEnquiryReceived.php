<?php

namespace App\Mail;

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
        return $this->subject('Yeni sorğu: '.$this->enquiry->inventory_code)
            ->view('emails.new-enquiry')
            ->with([
                'enquiry' => $this->enquiry,
                'adminUrl' => rtrim(config('app.url'), '/').'/admin#enquiries',
            ]);
    }
}
