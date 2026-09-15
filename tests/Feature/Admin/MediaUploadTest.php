<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private function data(TestResponse $response): array
    {
        return $response->json('data') ?? $response->json();
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);
        Storage::fake('local');
        Storage::fake('public');

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
    }

    public function test_unauthenticated_upload_is_denied(): void
    {
        $file = UploadedFile::fake()->image('a.jpg', 400, 300);

        $this->postJson('/admin/media', ['file' => $file])->assertStatus(401);
    }

    public function test_administrator_can_upload(): void
    {
        $file = UploadedFile::fake()->image('artwork.jpg', 1200, 900);

        $response = $this->actingAs($this->admin)->postJson('/admin/media', [
            'file' => $file,
            'alt_text' => ['az' => 'Kətan üzərində yağlı boya'],
        ]);

        $response->assertOk();
        $data = $this->data($response);

        $this->assertSame('image/jpeg', $data['mime_type']);
        $this->assertSame(1200, $data['width']);
        $this->assertSame(900, $data['height']);
        $this->assertCount(8, $data['variants']);
        $this->assertSame('Kətan üzərində yağlı boya', $data['alt_text']);
    }

    public function test_editor_can_upload(): void
    {
        $editor = User::factory()->create(['username' => 'jane.editor']);
        $editor->roles()->attach(Role::query()->firstOrCreate(['name' => 'editor']));

        $file = UploadedFile::fake()->image('artwork.jpg', 800, 800);

        $this->actingAs($editor)->postJson('/admin/media', ['file' => $file])->assertOk();
    }

    public function test_valid_png_upload_is_accepted(): void
    {
        $file = UploadedFile::fake()->image('artwork.png', 640, 480);

        $response = $this->actingAs($this->admin)->postJson('/admin/media', ['file' => $file]);

        $response->assertOk();
        $this->assertSame('image/png', $this->data($response)['mime_type']);
    }

    public function test_valid_webp_upload_is_accepted(): void
    {
        $file = UploadedFile::fake()->image('artwork.webp', 640, 480);

        $response = $this->actingAs($this->admin)->postJson('/admin/media', ['file' => $file]);

        $response->assertOk();
        $this->assertSame('image/webp', $this->data($response)['mime_type']);
    }

    public function test_oversized_file_is_rejected(): void
    {
        $file = UploadedFile::fake()->create('big.jpg', 10241, 'image/jpeg');

        $this->actingAs($this->admin)->postJson('/admin/media', ['file' => $file])->assertStatus(422);
        $this->assertDatabaseCount('media', 0);
    }

    public function test_corrupt_file_is_rejected(): void
    {
        $file = UploadedFile::fake()->create('broken.jpg', 5, 'image/jpeg');

        $this->actingAs($this->admin)->postJson('/admin/media', ['file' => $file])->assertStatus(422);
        $this->assertDatabaseCount('media', 0);
    }

    public function test_executable_masquerading_as_image_is_rejected(): void
    {
        $file = UploadedFile::fake()->create('shell.php.jpg', 10, 'image/jpeg');

        $this->actingAs($this->admin)->postJson('/admin/media', ['file' => $file])->assertStatus(422);
        $this->assertDatabaseCount('media', 0);
    }

    public function test_missing_file_is_rejected(): void
    {
        $this->actingAs($this->admin)->postJson('/admin/media', [])->assertStatus(422);
    }
}
