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

    public function test_email_is_branded_with_the_artniyyetli_logo(): void
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

        $html = (new NewEnquiryReceived($enquiry))->render();

        $this->assertMatchesRegularExpression('/<img src="data:image\/png;base64,[^"]+"[^>]*alt="ArtNiyyətli"/', $html);
    }

    public function test_message_line_breaks_are_preserved_and_html_is_escaped(): void
    {
        $subject = $this->makeSubject('general_contact', 'Ümumi əlaqə');
        $enquiry = Enquiry::query()->create([
            'enquiry_subject_id' => $subject->id,
            'submitted_at' => now(),
            'name' => 'Aysel',
            'contact' => 'aysel@example.com',
            'email' => 'aysel@example.com',
            'message' => "Salam,\n<script>alert(1)</script>",
            'status' => 'new',
        ]);
        $enquiry->load('artwork.translations', 'subject.translations');

        $html = (new NewEnquiryReceived($enquiry))->render();

        $this->assertStringContainsString('Salam,<br', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
        $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
    }

    public function test_phone_row_is_hidden_when_not_provided(): void
    {
        $subject = $this->makeSubject('general_contact', 'Ümumi əlaqə');
        $enquiry = Enquiry::query()->create([
            'enquiry_subject_id' => $subject->id,
            'submitted_at' => now(),
            'name' => 'Aysel',
            'contact' => 'aysel@example.com',
            'email' => 'aysel@example.com',
            'phone' => null,
            'message' => 'Salam.',
            'status' => 'new',
        ]);
        $enquiry->load('artwork.translations', 'subject.translations');

        $mailable = new NewEnquiryReceived($enquiry);

        $mailable->assertDontSeeInHtml('Telefon');
    }
}
