<?php

namespace Tests\Unit\Mail;

use App\Mail\NewEnquiryReceived;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NewEnquiryReceivedTest extends TestCase
{
    use RefreshDatabase;

    private function makeSubject(string $key, string $name): EnquirySubject
    {
        $subject = EnquirySubject::query()->create(['key' => $key, 'sort_order' => 0, 'is_active' => true]);
        $subject->translations()->create(['locale' => 'az', 'name' => $name]);

        return $subject;
    }

    public function test_buy_subject_keeps_the_artwork_subject_line_and_body(): void
    {
        $subject = $this->makeSubject('buy', 'Əsər almaq');
        $enquiry = Enquiry::query()->create([
            'enquiry_subject_id' => $subject->id,
            'inventory_code' => 'AN-000123',
            'submitted_at' => now(),
            'name' => 'Aysel',
            'contact' => 'aysel@example.com',
            'email' => 'aysel@example.com',
            'message' => 'Salam.',
            'status' => 'new',
        ]);
        $enquiry->load('artwork.translations', 'subject.translations');

        $mailable = new NewEnquiryReceived($enquiry);

        $mailable->assertHasSubject('Yeni sorğu: AN-000123');
        $mailable->assertSeeInHtml('İnventar kodu:');
    }

    public function test_non_buy_subject_uses_the_generic_subject_line_and_body(): void
    {
        $subject = $this->makeSubject('general_contact', 'Ümumi əlaqə');
        $enquiry = Enquiry::query()->create([
            'enquiry_subject_id' => $subject->id,
            'submitted_at' => now(),
            'name' => 'Aysel',
            'contact' => 'aysel@example.com',
            'email' => 'aysel@example.com',
            'message' => 'Salam.',
            'status' => 'new',
        ]);
        $enquiry->load('artwork.translations', 'subject.translations');

        $mailable = new NewEnquiryReceived($enquiry);

        $mailable->assertHasSubject('Yeni sorğu: Ümumi əlaqə');
        $mailable->assertDontSeeInHtml('İnventar kodu:');
        $mailable->assertSeeInHtml('Ümumi əlaqə');
    }
}
