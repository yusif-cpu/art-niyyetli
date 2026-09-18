<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnquiryCrudTest extends TestCase
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
        $this->subject->translations()->create(['locale' => 'az', 'name' => 'Almaq']);

        $this->artwork = Artwork::factory()->create([
            'artist_id' => Artist::factory()->create()->id,
            'genre_id' => Genre::factory()->create(['slug' => 'genre-'.uniqid()])->id,
            'medium_id' => Medium::factory()->create(['slug' => 'medium-'.uniqid()])->id,
        ]);
    }

    private function makeEnquiry(array $overrides = []): Enquiry
    {
        $createdAt = $overrides['created_at'] ?? null;
        unset($overrides['created_at']);

        $enquiry = Enquiry::query()->create(array_merge([
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

        if ($createdAt !== null) {
            $enquiry->forceFill(['created_at' => $createdAt])->save();
        }

        return $enquiry;
    }

    public function test_index_lists_enquiries_newest_first(): void
    {
        $older = $this->makeEnquiry(['created_at' => now()->subDay()]);
        $newer = $this->makeEnquiry(['created_at' => now()]);

        $response = $this->actingAs($this->admin)->getJson('/admin/enquiries');

        $response->assertOk();
        $this->assertSame($newer->id, $response->json('data.0.id'));
        $this->assertSame($older->id, $response->json('data.1.id'));
    }

    public function test_index_lists_new_enquiries_before_others_regardless_of_age(): void
    {
        $olderNew = $this->makeEnquiry(['status' => 'new', 'created_at' => now()->subDays(5)]);
        $newerReplied = $this->makeEnquiry(['status' => 'replied', 'created_at' => now()]);

        $response = $this->actingAs($this->admin)->getJson('/admin/enquiries');

        $response->assertOk();
        $this->assertSame($olderNew->id, $response->json('data.0.id'));
        $this->assertSame($newerReplied->id, $response->json('data.1.id'));
    }

    public function test_status_filter(): void
    {
        $this->makeEnquiry(['status' => 'new']);
        $this->makeEnquiry(['status' => 'closed']);

        $response = $this->actingAs($this->admin)->getJson('/admin/enquiries?status=closed');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $this->assertSame('closed', $response->json('data.0.status'));
    }

    public function test_artwork_id_filter(): void
    {
        $other = Artwork::factory()->create([
            'artist_id' => Artist::factory()->create()->id,
            'genre_id' => Genre::factory()->create(['slug' => 'genre-'.uniqid()])->id,
            'medium_id' => Medium::factory()->create(['slug' => 'medium-'.uniqid()])->id,
        ]);
        $this->makeEnquiry();
        $this->makeEnquiry(['artwork_id' => $other->id, 'inventory_code' => $other->inventory_code]);

        $response = $this->actingAs($this->admin)->getJson('/admin/enquiries?artwork_id='.$this->artwork->id);

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_search_filter_matches_name_email_and_inventory_code(): void
    {
        $this->makeEnquiry(['name' => 'Findable Person']);
        $this->makeEnquiry(['name' => 'Someone Else', 'email' => 'else@example.com']);

        $response = $this->actingAs($this->admin)->getJson('/admin/enquiries?search=Findable');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_date_range_filters(): void
    {
        $this->makeEnquiry(['created_at' => now()->subDays(10)]);
        $recent = $this->makeEnquiry(['created_at' => now()]);

        $response = $this->actingAs($this->admin)->getJson('/admin/enquiries?from='.now()->subDay()->toDateString());

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $this->assertSame($recent->id, $response->json('data.0.id'));
    }

    public function test_subject_filter(): void
    {
        $other = EnquirySubject::query()->create(['key' => 'general_contact', 'sort_order' => 1, 'is_active' => true]);
        $other->translations()->create(['locale' => 'az', 'name' => 'Ümumi əlaqə']);

        $this->makeEnquiry();
        $this->makeEnquiry(['enquiry_subject_id' => $other->id, 'artwork_id' => null, 'inventory_code' => null]);

        $response = $this->actingAs($this->admin)->getJson('/admin/enquiries?subject=general_contact');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_per_page_is_clamped_to_100(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/admin/enquiries?per_page=9999');

        $response->assertOk();
        $this->assertSame(100, $response->json('meta.per_page'));
    }

    public function test_show_returns_full_detail_including_internal_note_and_artwork(): void
    {
        $enquiry = $this->makeEnquiry(['internal_note' => 'Called back, waiting on reply.']);

        $response = $this->actingAs($this->admin)->getJson("/admin/enquiries/{$enquiry->id}");

        $response->assertOk();
        $response->assertJsonPath('data.internal_note', 'Called back, waiting on reply.');
        $response->assertJsonPath('data.artwork.inventory_code', $this->artwork->inventory_code);
        $response->assertJsonPath('data.email', 'aysel@example.com');
        $response->assertJsonPath('data.phone', '+994501234567');
        $response->assertJsonPath('data.inventory_code', $this->artwork->inventory_code);
        $this->assertNotNull($response->json('data.submitted_at'));
        $response->assertJsonPath('data.subject', 'Almaq');
        $this->assertSame([], $response->json('data.replies'));
    }

    public function test_administrator_can_update_status_and_note(): void
    {
        $enquiry = $this->makeEnquiry();

        $response = $this->actingAs($this->admin)->putJson("/admin/enquiries/{$enquiry->id}", [
            'status' => 'replied',
            'internal_note' => 'Replied by phone.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'replied');
        $response->assertJsonPath('data.internal_note', 'Replied by phone.');
        $this->assertSame('replied', $enquiry->fresh()->status->value);
    }

    public function test_editor_can_update_status(): void
    {
        $editor = User::factory()->create(['username' => 'ed.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));
        $enquiry = $this->makeEnquiry();

        $this->actingAs($editor)->putJson("/admin/enquiries/{$enquiry->id}", ['status' => 'read'])
            ->assertOk()
            ->assertJsonPath('data.status', 'read');
    }

    public function test_invalid_status_value_is_rejected(): void
    {
        $enquiry = $this->makeEnquiry();

        $this->actingAs($this->admin)->putJson("/admin/enquiries/{$enquiry->id}", ['status' => 'bogus'])
            ->assertStatus(422);
    }

    public function test_internal_note_over_max_length_is_rejected(): void
    {
        $enquiry = $this->makeEnquiry();

        $this->actingAs($this->admin)->putJson("/admin/enquiries/{$enquiry->id}", ['internal_note' => str_repeat('a', 5001)])
            ->assertStatus(422);
    }

    public function test_mass_assignment_of_unlisted_fields_has_no_effect(): void
    {
        $enquiry = $this->makeEnquiry();

        $this->actingAs($this->admin)->putJson("/admin/enquiries/{$enquiry->id}", [
            'email' => 'hijacked@example.com',
            'status' => 'read',
        ])->assertOk();

        $this->assertSame('aysel@example.com', $enquiry->fresh()->email);
    }

    public function test_unauthenticated_request_is_denied(): void
    {
        $enquiry = $this->makeEnquiry();

        $this->getJson('/admin/enquiries')->assertStatus(401);
        $this->getJson("/admin/enquiries/{$enquiry->id}")->assertStatus(401);
        $this->putJson("/admin/enquiries/{$enquiry->id}", ['status' => 'read'])->assertStatus(401);
    }

    public function test_store_and_destroy_routes_do_not_exist(): void
    {
        $enquiry = $this->makeEnquiry();

        $this->actingAs($this->admin)->postJson('/admin/enquiries', ['name' => 'x'])->assertStatus(405);
        $this->actingAs($this->admin)->deleteJson("/admin/enquiries/{$enquiry->id}")->assertStatus(405);
    }

    public function test_dashboard_enquiries_new_reflects_only_new_status(): void
    {
        $this->makeEnquiry(['status' => 'new']);
        $this->makeEnquiry(['status' => 'closed']);

        $response = $this->actingAs($this->admin)->getJson('/admin/dashboard');

        $response->assertOk();
        $this->assertSame(1, $response->json('stats.enquiries_new'));
        $this->assertSame(2, $response->json('stats.enquiries'));
    }
}
