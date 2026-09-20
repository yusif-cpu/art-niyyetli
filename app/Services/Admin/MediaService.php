<?php

namespace App\Services\Admin;

use App\Exceptions\MediaDeletionNotAllowedException;
use App\Exceptions\MediaProcessingFailedException;
use App\Models\Media;
use App\Models\SiteSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class MediaService
{
    /** The width of the `media.original_filename` column, in characters. */
    private const FILENAME_MAX_LENGTH = 255;

    public function __construct(private MediaVariantGenerator $variants) {}

    public function upload(UploadedFile $file, array $altText): Media
    {
        // The header alone gives the dimensions: check them BEFORE decoding, because decoding needs about four
        // bytes per pixel however small the file is on disk (a tiny file can declare an enormous image).
        $dimensions = @getimagesize($file->getRealPath());

        if ($dimensions === false) {
            throw $this->invalidImage();
        }

        [$width, $height] = $dimensions;

        $this->assertWithinSizeLimits($width, $height);

        $binary = file_get_contents($file->getRealPath());

        if (@imagecreatefromstring($binary) === false) {
            throw $this->invalidImage();
        }

        $mimeType = $dimensions['mime'];
        $extension = config("media.allowed_mimes.{$mimeType}");

        if ($extension === null) {
            throw ValidationException::withMessages([
                'file' => ['Only JPEG, PNG, and WebP images are accepted.'],
            ]);
        }

        $originalDisk = config('media.disks.original');
        $originalPath = 'media/'.Str::uuid().'/original.'.$extension;

        Storage::disk($originalDisk)->put($originalPath, $binary, 'private');

        // Public files written by the variant generator; kept outside the transaction so they can still be
        // removed if the transaction fails after the files exist.
        $publicPaths = [];

        try {
            return DB::transaction(function () use ($binary, $mimeType, $width, $height, $file, $originalDisk, $originalPath, $altText, &$publicPaths) {
                $media = Media::create([
                    'type' => 'image',
                    'disk' => $originalDisk,
                    'path' => $originalPath,
                    'original_filename' => mb_substr($file->getClientOriginalName(), 0, self::FILENAME_MAX_LENGTH),
                    'mime_type' => $mimeType,
                    'size_bytes' => $file->getSize(),
                    'original_width' => $width,
                    'original_height' => $height,
                    'aspect_ratio' => round($width / $height, 6),
                ]);

                $this->syncTranslations($media, $altText);
                $publicPaths = $this->variants->generate($media, $binary);

                return $media->fresh(['translations', 'variants']);
            });
        } catch (Throwable $e) {
            Storage::disk($originalDisk)->delete($originalPath);
            $this->variants->deleteFiles($publicPaths);

            if ($e instanceof ValidationException) {
                throw $e;
            }

            throw new MediaProcessingFailedException('Image processing failed. Please try again.', 0, $e);
        }
    }

    public function updateAltText(Media $media, array $altText): Media
    {
        $this->syncTranslations($media, $altText);

        return $media->fresh(['translations', 'variants']);
    }

    public function delete(Media $media): void
    {
        $usedBy = $this->usedBy($media);

        if ($usedBy !== []) {
            throw new MediaDeletionNotAllowedException(sprintf(
                'This media file is still used by %s and cannot be deleted. Remove it from there first.',
                $this->sentence($usedBy)
            ));
        }

        $media->delete();
    }

    /**
     * Every kind of record that still points at this media file. Records that are archived (soft-deleted) still
     * count: they keep their reference, and restoring one would otherwise bring back a broken image.
     *
     * @return array<int, string> human-readable kinds, in a stable order
     */
    private function usedBy(Media $media): array
    {
        $used = [];

        // ArtworkImage, ExhibitionMedium, PageSection, SocialLink and SeoMetadata rows are not soft-deletable, so they
        // exist for as long as the reference does, even when the artwork/exhibition/page that owns them is archived.
        if ($media->artworkImages()->exists()) {
            $used[] = 'an artwork';
        }

        if ($media->representingArtists()->withTrashed()->exists()) {
            $used[] = 'an artist';
        }

        if ($media->exhibitionMedia()->exists()) {
            $used[] = 'an exhibition';
        }

        if ($media->articles()->withTrashed()->exists()) {
            $used[] = 'an article';
        }

        if ($media->pageSections()->exists()) {
            $used[] = 'a page section';
        }

        if ($media->socialLinks()->exists()) {
            $used[] = 'a social link';
        }

        if ($this->isTheSiteLogo($media)) {
            $used[] = 'the site logo';
        }

        if ($media->seoMetadata()->exists()) {
            $used[] = 'an SEO record';
        }

        return $used;
    }

    /** The logo is a site setting holding the media id as a string, not a foreign key. */
    private function isTheSiteLogo(Media $media): bool
    {
        return SiteSetting::query()
            ->where('key', 'logo_media_id')
            ->where('value', (string) $media->id)
            ->exists();
    }

    /** @param array<int, string> $items */
    private function sentence(array $items): string
    {
        $last = array_pop($items);

        return $items === [] ? $last : implode(', ', $items).' and '.$last;
    }

    private function invalidImage(): ValidationException
    {
        return ValidationException::withMessages([
            'file' => ['The uploaded file is not a valid, readable image.'],
        ]);
    }

    /**
     * @throws ValidationException when the image is larger than the configured limits (see config/media.php)
     */
    private function assertWithinSizeLimits(int $width, int $height): void
    {
        $maxPixels = (int) config('media.max_pixels');
        $maxEdge = (int) config('media.max_edge_px');

        if ($width * $height <= $maxPixels && max($width, $height) <= $maxEdge) {
            return;
        }

        // Worded to read sensibly in the admin's existing upload error display (which recognises "large"/"maximum").
        throw ValidationException::withMessages([
            'file' => [sprintf(
                'The image is too large to process (%d × %d pixels, %s megapixels). The maximum is %s megapixels and %d pixels on the longest side.',
                $width,
                $height,
                round($width * $height / 1_000_000, 1),
                round($maxPixels / 1_000_000, 1),
                $maxEdge
            )],
        ]);
    }

    private function syncTranslations(Media $media, array $altText): void
    {
        foreach (['az', 'en'] as $locale) {
            if (! array_key_exists($locale, $altText)) {
                continue;
            }

            $media->translations()->updateOrCreate(
                ['locale' => $locale],
                ['alt_text' => $altText[$locale]]
            );
        }
    }
}
