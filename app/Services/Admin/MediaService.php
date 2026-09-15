<?php

namespace App\Services\Admin;

use App\Exceptions\MediaDeletionNotAllowedException;
use App\Exceptions\MediaProcessingFailedException;
use App\Models\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class MediaService
{
    public function __construct(private MediaVariantGenerator $variants) {}

    public function upload(UploadedFile $file, array $altText): Media
    {
        $binary = file_get_contents($file->getRealPath());
        $dimensions = @getimagesize($file->getRealPath());

        if ($dimensions === false || @imagecreatefromstring($binary) === false) {
            throw ValidationException::withMessages([
                'file' => ['The uploaded file is not a valid, readable image.'],
            ]);
        }

        [$width, $height] = $dimensions;
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

        try {
            return DB::transaction(function () use ($binary, $mimeType, $width, $height, $file, $originalDisk, $originalPath, $altText) {
                $media = Media::create([
                    'type' => 'image',
                    'disk' => $originalDisk,
                    'path' => $originalPath,
                    'original_filename' => $file->getClientOriginalName(),
                    'mime_type' => $mimeType,
                    'size_bytes' => $file->getSize(),
                    'original_width' => $width,
                    'original_height' => $height,
                    'aspect_ratio' => round($width / $height, 6),
                ]);

                $this->syncTranslations($media, $altText);
                $this->variants->generate($media, $binary);

                return $media->fresh(['translations', 'variants']);
            });
        } catch (Throwable $e) {
            Storage::disk($originalDisk)->delete($originalPath);

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
        if ($this->isReferenced($media)) {
            throw new MediaDeletionNotAllowedException(
                'This media file is still attached to an artwork, artist, exhibition, or SEO record and cannot be deleted.'
            );
        }

        $media->delete();
    }

    private function isReferenced(Media $media): bool
    {
        return $media->artworkImages()->exists()
            || $media->representingArtists()->exists()
            || $media->exhibitionMedia()->exists()
            || $media->seoMetadata()->exists();
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
