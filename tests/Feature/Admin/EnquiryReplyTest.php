<?php

namespace Tests\Feature\Admin;

use App\Mail\EnquiryReplyMail;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use App\Services\Admin\SiteSettingService;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EnquiryReplyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Artwork $artwork;

    private EnquirySubject $subject;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));

        $this->subject = EnquirySubject::query()->create(['key' => 'buy', 'sort_order' => 0, 'is_active' => true]);

        $this->artwork = Artwork::factory()->create([
            'artist_id' => Artist::factory()->create()->id,
            'genre_id' => Genre::factory()->create(['slug' => 'genre-'.uniqid()])->id,
            'medium_id' => Medium::factory()->create(['slug' => 'medium-'.uniqid()])->id,
        ]);
    }

    private function makeEnquiry(array $overrides = []): Enquiry
    {
        return Enquiry::query()->create(array_merge([
            'enquiry_subject_id' => $this->subject->id,
            'artwork_id' => $this->artwork->id,
            'inventory_code' => $this->artwork->inventory_code,
            'submitted_at' => now(),
            'name' => 'Aysel Məmmədova',
            'contact' => 'aysel@example.com',
            'email' => 'aysel@example.com',
            'phone' => '+994501234567',
            'message' => 'Salam, bu əsər haqqında məlumat almaq istəyirəm.',
            'status' => 'new',
        ], $overrides));
    }

    public function test_administrator_can_send_reply(): void
    {
        Mail::fake();

        $enquiry = $this->makeEnquiry();

        $response = $this->actingAs($this->admin)->postJson("/admin/enquiries/{$enquiry->id}/reply", [
            'subject' => 'Re: Sorğunuz',
            'message' => "Salam,\nSizinlə əlaqə saxlayırıq.",
        ]);

        $this->assertContains($response->getStatusCode(), [200, 201]);
        $response->assertJsonPath('data.recipient', $enquiry->email);
        $response->assertJsonPath('data.subject', 'Re: Sorğunuz');
        $response->assertJsonPath('data.status', 'sent');
        $this->assertNotNull($response->json('data.sent_at'));
        $this->assertNotNull($response->json('data.created_at'));

        $this->assertSame('replied', $enquiry->fresh()->status->value);

        $this->assertDatabaseHas('enquiry_replies', [
            'enquiry_id' => $enquiry->id,
            'recipient' => $enquiry->email,
            'status' => 'sent',
        ]);

        Mail::assertSent(EnquiryReplyMail::class, fn ($mail) => $mail->hasTo($enquiry->email));
    }

    public function test_reply_headers_use_from_config_and_reply_to_gallery_contact_email(): void
    {
        app(SiteSettingService::class)->update(['contact_email' => 'gallery@example.com']);

        $enquiry = $this->makeEnquiry();

        $this->actingAs($this->admin)->postJson("/admin/enquiries/{$enquiry->id}/reply", [
            'subject' => 'Re: Sorğunuz',
            'message' => 'Salam',
        ])->assertSuccessful();

        $message = Mail::getSymfonyTransport()->messages()->last()->getOriginalMessage();

        $this->assertSame(config('mail.from.address'), $message->getFrom()[0]->getAddress());
        $this->assertSame($enquiry->email, $message->getTo()[0]->getAddress());
        $this->assertSame('gallery@example.com', $message->getReplyTo()[0]->getAddress());
    }

    public function test_editor_can_send_reply(): void
    {
        Mail::fake();

        $editor = User::factory()->create(['username' => 'ed.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $enquiry = $this->makeEnquiry();

        $response = $this->actingAs($editor)->postJson("/admin/enquiries/{$enquiry->id}/reply", [
            'subject' => 'Re: Sorğunuz',
            'message' => 'Salam',
        ]);

        $this->assertContains($response->getStatusCode(), [200, 201]);
        $response->assertJsonPath('data.status', 'sent');
    }

    public function test_unauthenticated_request_is_denied(): void
    {
        $enquiry = $this->makeEnquiry();

        $this->postJson("/admin/enquiries/{$enquiry->id}/reply", [
            'subject' => 'x',
            'message' => 'y',
        ])->assertStatus(401);
    }

    public function test_empty_subject_and_message_are_rejected(): void
    {
        $enquiry = $this->makeEnquiry();

        $this->actingAs($this->admin)->postJson("/admin/enquiries/{$enquiry->id}/reply", [
            'subject' => '',
            'message' => '',
        ])->assertStatus(422);
    }

    public function test_reply_is_rejected_when_enquiry_has_no_email(): void
    {
        Mail::fake();

        $enquiry = $this->makeEnquiry(['email' => null]);

        $response = $this->actingAs($this->admin)->postJson("/admin/enquiries/{$enquiry->id}/reply", [
            'subject' => 'Re: Sorğunuz',
            'message' => 'Salam',
        ]);

        $response->assertStatus(422);

        $this->assertDatabaseMissing('enquiry_replies', ['enquiry_id' => $enquiry->id]);
        $this->assertSame('new', $enquiry->fresh()->status->value);
        Mail::assertNothingSent();
    }

    public function test_mail_escapes_html_in_reply_body(): void
    {
        $enquiry = $this->makeEnquiry();

        $html = (new EnquiryReplyMail($enquiry, 'Test', '<script>alert(1)</script>'))->render();

        $this->assertStringContainsString('&lt;script&gt;', $html);
        $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
    }

    public function test_mail_is_branded_with_the_artniyyetli_logo_and_greets_the_customer(): void
    {
        $enquiry = $this->makeEnquiry();

        $html = (new EnquiryReplyMail($enquiry, 'Re: Sorğunuz', 'Salam.'))->render();

        $this->assertStringContainsString('images/logo-horizontal-ivory.png', $html);
        $this->assertStringContainsString('Salam, '.$enquiry->name, $html);
    }

    public function test_mail_shows_artwork_context_for_a_purchase_enquiry(): void
    {
        $enquiry = $this->makeEnquiry();

        $html = (new EnquiryReplyMail($enquiry, 'Re: Sorğunuz', 'Salam.'))->render();

        $this->assertStringContainsString($enquiry->inventory_code, $html);
    }

    public function test_mail_does_not_show_an_empty_inventory_code_row_for_a_non_purchase_enquiry(): void
    {
        $generalSubject = EnquirySubject::query()->create(['key' => 'general_contact', 'sort_order' => 1, 'is_active' => true]);
        $generalSubject->translations()->create(['locale' => 'az', 'name' => 'Ümumi əlaqə']);

        $enquiry = $this->makeEnquiry([
            'enquiry_subject_id' => $generalSubject->id,
            'artwork_id' => null,
            'inventory_code' => null,
        ]);

        $html = (new EnquiryReplyMail($enquiry, 'Re: Sualınız', 'Salam.'))->render();

        $this->assertStringNotContainsString('İnventar kodu:', $html);
        $this->assertStringContainsString('Ümumi əlaqə', $html);
    }

    public function test_reply_persists_failed_status_when_mail_send_throws(): void
    {
        Mail::shouldReceive('to')->once()->andThrow(new \Exception('boom'));

        $enquiry = $this->makeEnquiry();

        $response = $this->actingAs($this->admin)->postJson("/admin/enquiries/{$enquiry->id}/reply", [
            'subject' => 'Re: Sorğunuz',
            'message' => 'Salam',
        ]);

        $response->assertStatus(502);

        $this->assertDatabaseHas('enquiry_replies', [
            'enquiry_id' => $enquiry->id,
            'status' => 'failed',
        ]);

        $this->assertSame('new', $enquiry->fresh()->status->value);
    }
}
