<?php

namespace Tests\Feature\Admin;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Support\ManipulatesEnvironment;
use Tests\TestCase;

/**
 * Decoding an image needs memory in proportion to its PIXELS, not its file size, so a tiny file can declare an
 * enormous image (and a real 48 MP photo can exhaust PHP's memory). The dimensions are therefore read from the file
 * header and checked BEFORE the image is decoded: an oversized upload is an ordinary 422 instead of a fatal 500.
 */
class MediaUploadDimensionsTest extends TestCase
{
    use ManipulatesEnvironment, RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(PreventRequestForgery::class);
        Storage::fake('local');
        Storage::fake('public');

        // Small limits so the boundary can be tested with small, real images.
        config(['media.max_pixels' => 1_000_000, 'media.max_edge_px' => 2000]);

        $this->admin = User::factory()->create(['username' => 'jane.admin']);
        $this->admin->roles()->attach(Role::query()->firstOrCreate(['name' => 'administrator']));
    }

    protected function tearDown(): void
    {
        $this->restoreEnvironment();

        parent::tearDown();
    }

    private function upload(UploadedFile $file): TestResponse
    {
        return $this->actingAs($this->admin)->postJson('/admin/media', ['file' => $file]);
    }

    private function assertNothingWasStored(): void
    {
        $this->assertDatabaseCount('media', 0);
        $this->assertDatabaseCount('media_variants', 0);
        $this->assertSame([], Storage::disk('local')->allFiles(), 'no original was written');
        $this->assertSame([], Storage::disk('public')->allFiles(), 'no variant was written');
    }

    /** A PNG whose header declares the given size but which holds only a few dozen bytes of pixel data. */
    private function pngDeclaring(int $width, int $height): string
    {
        $chunk = fn (string $type, string $data) => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));

        return "\x89PNG\r\n\x1a\n"
            .$chunk('IHDR', pack('NNCCCCC', $width, $height, 8, 2, 0, 0, 0))
            .$chunk('IDAT', gzcompress(str_repeat("\0", 16)))
            .$chunk('IEND', '');
    }

    // -- the pixel-count ceiling -------------------------------------------------------------------------------

    public function test_an_image_exactly_at_the_pixel_limit_is_accepted(): void
    {
        $this->upload(UploadedFile::fake()->image('exact.jpg', 1000, 1000))->assertOk()->assertJsonPath('data.width', 1000);
    }

    public function test_an_image_over_the_pixel_limit_is_refused_with_a_clear_validation_error(): void
    {
        $response = $this->upload(UploadedFile::fake()->image('big.jpg', 1000, 1001));

        $response->assertStatus(422)->assertJsonValidationErrors(['file']);
        $this->assertSame(
            'The image is too large to process (1000 × 1001 pixels, 1 megapixels). The maximum is 1 megapixels and 2000 pixels on the longest side.',
            $response->json('errors.file.0')
        );
        $this->assertNothingWasStored();
    }

    public function test_the_error_reads_correctly_in_the_admins_existing_upload_error_display(): void
    {
        // The admin UI turns an upload error containing mime/extension/format/type into "unsupported format" advice and
        // one containing max/size/large into "too large". This message must land in the second bucket, not the first.
        $message = $this->upload(UploadedFile::fake()->image('big.jpg', 1000, 1001))->json('errors.file.0');

        $this->assertDoesNotMatchRegularExpression('/mime|extension|format|type/i', $message);
        $this->assertMatchesRegularExpression('/max|size|kilobytes|large/i', $message);
    }

    // -- the longest-edge ceiling ------------------------------------------------------------------------------

    public function test_an_image_exactly_at_the_edge_limit_is_accepted(): void
    {
        $this->upload(UploadedFile::fake()->image('wide.png', 2000, 400))->assertOk();
    }

    public function test_an_image_over_the_edge_limit_is_refused_even_when_its_pixel_count_is_small(): void
    {
        $response = $this->upload(UploadedFile::fake()->image('too-wide.png', 2001, 400));

        $response->assertStatus(422)->assertJsonValidationErrors(['file']);
        $this->assertStringContainsString('too large', $response->json('errors.file.0'));
        $this->assertNothingWasStored();
    }

    public function test_the_limit_applies_to_every_accepted_format(): void
    {
        foreach (['over.jpg', 'over.png', 'over.webp'] as $name) {
            $this->upload(UploadedFile::fake()->image($name, 1001, 1000))->assertStatus(422)->assertJsonValidationErrors(['file']);
        }

        $this->assertNothingWasStored();
    }

    // -- refused before decoding, not after -------------------------------------------------------------------

    public function test_a_tiny_file_that_declares_a_huge_image_is_refused_from_its_header_alone(): void
    {
        $bytes = $this->pngDeclaring(20000, 20000); // 400 megapixels declared, about 60 bytes of data

        $this->assertLessThan(200, strlen($bytes));

        $start = microtime(true);
        $response = $this->upload(UploadedFile::fake()->createWithContent('bomb.png', $bytes));

        // "too large", not "not a valid image": had it been decoded first it would have exhausted memory or failed to decode.
        $response->assertStatus(422)->assertJsonValidationErrors(['file']);
        $this->assertStringContainsString('20000 × 20000 pixels, 400 megapixels', $response->json('errors.file.0'));
        $this->assertLessThan(2.0, microtime(true) - $start);
        $this->assertNothingWasStored();
    }

    public function test_an_absurdly_wide_declaration_is_refused_by_the_edge_limit(): void
    {
        $response = $this->upload(UploadedFile::fake()->createWithContent('strip.png', $this->pngDeclaring(60000, 10)));

        $response->assertStatus(422);
        $this->assertStringContainsString('too large', $response->json('errors.file.0'));
    }

    // -- unchanged behaviour ---------------------------------------------------------------------------------

    public function test_a_corrupt_file_still_gets_the_same_not_a_valid_image_error(): void
    {
        $response = $this->upload(UploadedFile::fake()->create('broken.jpg', 5, 'image/jpeg'));

        $response->assertStatus(422);
        $this->assertSame('The uploaded file is not a valid, readable image.', $response->json('errors.file.0'));
    }

    public function test_an_in_limit_image_is_processed_exactly_as_before(): void
    {
        $response = $this->upload(UploadedFile::fake()->image('artwork.jpg', 900, 600));

        $response->assertOk();
        $this->assertCount(8, $response->json('data.variants'));
        $this->assertSame(900, $response->json('data.width'));
        $this->assertSame(600, $response->json('data.height'));
        $this->assertCount(8, Storage::disk('public')->allFiles());
        $this->assertCount(1, Storage::disk('local')->allFiles());
    }

    // -- configuration -----------------------------------------------------------------------------------------

    public function test_the_shipped_defaults_are_the_measured_28_megapixels_and_12000_pixels(): void
    {
        $config = $this->configFileWith('media', ['MEDIA_MAX_PIXELS' => null, 'MEDIA_MAX_EDGE' => null]);

        $this->assertSame(28_000_000, $config['max_pixels']);
        $this->assertSame(12_000, $config['max_edge_px']);
    }

    public function test_the_limits_can_be_set_from_the_environment(): void
    {
        $config = $this->configFileWith('media', ['MEDIA_MAX_PIXELS' => '50000000', 'MEDIA_MAX_EDGE' => '20000']);

        $this->assertSame(50_000_000, $config['max_pixels']);
        $this->assertSame(20_000, $config['max_edge_px']);
    }

    public function test_an_ordinary_24_megapixel_camera_frame_is_within_the_shipped_limits(): void
    {
        $config = $this->configFileWith('media', ['MEDIA_MAX_PIXELS' => null, 'MEDIA_MAX_EDGE' => null]);

        $this->assertLessThanOrEqual($config['max_pixels'], 6000 * 4000);
        $this->assertLessThanOrEqual($config['max_edge_px'], 6000);
    }
}
