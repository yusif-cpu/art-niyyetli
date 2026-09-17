<?php

namespace Tests\Feature\Admin;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use App\Models\Exhibition;
use App\Models\Genre;
use App\Models\Medium;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
    }

    public function test_dashboard_still_returns_existing_message_user_and_stats_keys(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/admin/dashboard');

        $response->assertOk();
        $response->assertJsonPath('message', 'Authenticated admin access confirmed.');
        $response->assertJsonPath('user.username', 'jane.admin');
        $response->assertJsonStructure([
            'stats' => ['artists', 'artworks', 'exhibitions', 'articles', 'faqs', 'enquiries', 'enquiries_new'],
        ]);
    }

    public function test_dashboard_returns_five_most_recent_enquiries_ordered_by_submitted_at(): void
    {
        $subject = EnquirySubject::query()->create(['key' => 'buy', 'sort_order' => 0, 'is_active' => true]);
        $subject->translations()->create(['locale' => 'az', 'name' => 'Almaq']);

        $artwork = Artwork::factory()->create([
            'artist_id' => Artist::factory()->create()->id,
            'genre_id' => Genre::factory()->create(['slug' => 'genre-'.uniqid()])->id,
            'medium_id' => Medium::factory()->create(['slug' => 'medium-'.uniqid()])->id,
        ]);

        $makeEnquiry = function (string $name, $submittedAt) use ($subject, $artwork): Enquiry {
            return Enquiry::query()->create([
                'enquiry_subject_id' => $subject->id,
                'artwork_id' => $artwork->id,
                'inventory_code' => $artwork->inventory_code,
                'submitted_at' => $submittedAt,
                'name' => $name,
                'contact' => 'test@example.com',
                'email' => 'test@example.com',
                'phone' => '+994501234567',
                'message' => 'Salam.',
                'status' => 'new',
            ]);
        };

        // 6 enquiries, only the newest 5 (by submitted_at) should appear.
        $oldest = $makeEnquiry('Oldest', now()->subDays(6));
        $makeEnquiry('Second Oldest', now()->subDays(5));
        $newest = $makeEnquiry('Newest', now());
        $makeEnquiry('Third', now()->subDays(1));
        $makeEnquiry('Fourth', now()->subDays(2));
        $makeEnquiry('Fifth', now()->subDays(3));

        $response = $this->actingAs($this->admin)->getJson('/admin/dashboard');

        $response->assertOk();
        $recent = $response->json('recent_enquiries');

        $this->assertCount(5, $recent);
        $this->assertSame($newest->id, $recent[0]['id']);
        $this->assertSame('Newest', $recent[0]['name']);
        $this->assertSame('new', $recent[0]['status']);
        $this->assertSame($artwork->inventory_code, $recent[0]['inventory_code']);
        $this->assertArrayHasKey('created_at', $recent[0]);
        $this->assertNotContains($oldest->id, array_column($recent, 'id'));
    }

    public function test_dashboard_returns_only_upcoming_exhibitions_ordered_by_start_date(): void
    {
        $current = Exhibition::factory()->create(['status' => 'current', 'start_date' => now()->subDay(), 'end_date' => now()->addDays(10)]);
        $current->translations()->create(['locale' => 'az', 'slug' => 'current-'.uniqid(), 'title' => 'Current Exhibition', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $past = Exhibition::factory()->create(['status' => 'past', 'start_date' => now()->subMonths(2), 'end_date' => now()->subMonth()]);
        $past->translations()->create(['locale' => 'az', 'slug' => 'past-'.uniqid(), 'title' => 'Past Exhibition', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $laterUpcoming = Exhibition::factory()->create(['status' => 'upcoming', 'start_date' => now()->addMonths(3), 'end_date' => now()->addMonths(4)]);
        $laterUpcoming->translations()->create(['locale' => 'az', 'slug' => 'later-'.uniqid(), 'title' => 'Later Upcoming', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $soonUpcoming = Exhibition::factory()->create(['status' => 'upcoming', 'start_date' => now()->addMonth(), 'end_date' => now()->addMonths(2)]);
        $soonUpcoming->translations()->create(['locale' => 'az', 'slug' => 'soon-'.uniqid(), 'title' => 'Soon Upcoming', 'venue' => 'V', 'short_text' => 'S', 'full_text' => 'F']);

        $response = $this->actingAs($this->admin)->getJson('/admin/dashboard');

        $response->assertOk();
        $upcoming = $response->json('upcoming_exhibitions');

        $this->assertCount(2, $upcoming);
        $this->assertSame($soonUpcoming->id, $upcoming[0]['id']);
        $this->assertSame('Soon Upcoming', $upcoming[0]['title']);
        $this->assertSame($laterUpcoming->id, $upcoming[1]['id']);
        $this->assertArrayHasKey('start_date', $upcoming[0]);
        $this->assertArrayHasKey('end_date', $upcoming[0]);
        $this->assertNotContains($current->id, array_column($upcoming, 'id'));
        $this->assertNotContains($past->id, array_column($upcoming, 'id'));
    }

    public function test_dashboard_returns_five_most_recently_created_artworks(): void
    {
        $artist = Artist::factory()->create();
        $genre = Genre::factory()->create(['slug' => 'genre-'.uniqid()]);
        $medium = Medium::factory()->create(['slug' => 'medium-'.uniqid()]);

        $artworks = [];
        for ($i = 0; $i < 6; $i++) {
            $artwork = Artwork::factory()->create([
                'artist_id' => $artist->id,
                'genre_id' => $genre->id,
                'medium_id' => $medium->id,
            ]);
            $artwork->translations()->create([
                'locale' => 'az',
                'slug' => 'artwork-'.$i.'-'.uniqid(),
                'title' => 'Artwork '.$i,
                'short_description' => 'S',
                'provenance' => 'P',
            ]);
            $artwork->forceFill(['created_at' => now()->subDays(6 - $i)])->save();
            $artworks[] = $artwork;
        }

        // Newest artwork, created last.
        $newest = end($artworks);
        $oldest = $artworks[0];

        $response = $this->actingAs($this->admin)->getJson('/admin/dashboard');

        $response->assertOk();
        $recent = $response->json('recent_artworks');

        $this->assertCount(5, $recent);
        $this->assertSame($newest->id, $recent[0]['id']);
        $this->assertSame('Artwork 5', $recent[0]['title']);
        $this->assertSame($newest->inventory_code, $recent[0]['inventory_code']);
        $this->assertArrayHasKey('created_at', $recent[0]);
        $this->assertNotContains($oldest->id, array_column($recent, 'id'));
    }
}
