<?php

namespace App\Services\Admin;

use App\Exceptions\MediaProcessingFailedException;
use App\Models\Media;
use App\Models\MediaVariant;
use GdImage;
use Illuminate\Support\Facades\Storage;
use Throwable;

class MediaVariantGenerator
{
    /**
     * Writes every size/format combination for the media and returns the paths of the files it created.
     *
     * If anything fails part-way, the files this call created are removed again before the exception is
     * rethrown, so a failed upload never leaves orphaned public files behind.
     *
     * @return array<int, string> paths (on the public disk) of the files created by this call
     */
    public function generate(Media $media, string $sourceBinary): array
    {
        $source = @imagecreatefromstring($sourceBinary);

        if (! $source instanceof GdImage) {
            throw new MediaProcessingFailedException('Unable to decode the source image for variant generation.');
        }

        $token = $this->tokenFor($media);
        $created = [];

        try {
            foreach (config('media.variants') as $variantName => $variantConfig) {
                [$width, $height] = $this->scaledDimensions(
                    imagesx($source), imagesy($source), $variantConfig['max_dimension']
                );

                $resized = $this->resample($source, $width, $height);

                try {
                    foreach (config('media.formats') as $formatName => $formatConfig) {
                        $this->storeVariant($media, $token, $resized, $variantName, $formatName, $formatConfig, $width, $height, $created);
                    }
                } finally {
                    imagedestroy($resized);
                }
            }
        } catch (Throwable $e) {
            $this->deleteFiles($created);

            throw $e;
        } finally {
            imagedestroy($source);
        }

        return $created;
    }

    /** Removes files previously reported by generate() (missing files are ignored). */
    public function deleteFiles(array $paths): void
    {
        if ($paths !== []) {
            Storage::disk(config('media.disks.public'))->delete($paths);
        }
    }

    /**
     * Variant files live at media/{id}/{token}/{variant}.{ext}. The token is random per media, so the address of
     * a file cannot be worked out from the media id: the images of a draft or otherwise unpublished work are not
     * reachable unless the address is known, and the public API only ever reveals addresses of published content.
     * (Variants generated before this scheme keep their old paths.) Regenerating reuses the media's existing token,
     * so the same files are overwritten instead of new ones piling up.
     */
    private function tokenFor(Media $media): string
    {
        foreach ($media->variants()->pluck('path') as $path) {
            if (preg_match('#^media/\d+/([0-9a-f]{32})/#', $path, $matches) === 1) {
                return $matches[1];
            }
        }

        return bin2hex(random_bytes(16));
    }

    /** @param array<int, string> $created collects the path of every file this call newly creates */
    private function storeVariant(Media $media, string $token, GdImage $image, string $variantName, string $formatName, array $formatConfig, int $width, int $height, array &$created): void
    {
        $binary = $this->encode($image, $formatName, $formatConfig['quality']);

        $disk = config('media.disks.public');
        $path = "media/{$media->id}/{$token}/{$variantName}-{$formatName}.{$formatConfig['extension']}";

        // Only a file that did not exist before is ours to remove if a later step fails.
        if (! Storage::disk($disk)->exists($path)) {
            $created[] = $path;
        }

        Storage::disk($disk)->put($path, $binary, 'public');

        MediaVariant::updateOrCreate(
            ['media_id' => $media->id, 'variant' => "{$variantName}-{$formatName}"],
            [
                'disk' => $disk,
                'path' => $path,
                'mime_type' => $formatConfig['mime'],
                'size_bytes' => strlen($binary),
                'width' => $width,
                'height' => $height,
            ]
        );
    }

    private function scaledDimensions(int $originalWidth, int $originalHeight, int $maxDimension): array
    {
        $longestEdge = max($originalWidth, $originalHeight);

        if ($longestEdge <= $maxDimension) {
            return [$originalWidth, $originalHeight];
        }

        $scale = $maxDimension / $longestEdge;

        return [
            max(1, (int) round($originalWidth * $scale)),
            max(1, (int) round($originalHeight * $scale)),
        ];
    }

    private function resample(GdImage $source, int $width, int $height): GdImage
    {
        $canvas = imagecreatetruecolor($width, $height);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        imagefill($canvas, 0, 0, imagecolorallocatealpha($canvas, 0, 0, 0, 127));
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $width, $height, imagesx($source), imagesy($source));

        return $canvas;
    }

    private function encode(GdImage $image, string $format, int $quality): string
    {
        ob_start();

        match ($format) {
            'webp' => $this->encodeWebp($image, $quality),
            'jpeg' => $this->encodeJpeg($image, $quality),
            default => throw new MediaProcessingFailedException("Unsupported output format [{$format}]."),
        };

        return ob_get_clean();
    }

    private function encodeWebp(GdImage $image, int $quality): void
    {
        if (! function_exists('imagewebp')) {
            throw new MediaProcessingFailedException('The image processing engine does not support WebP output.');
        }

        imagewebp($image, null, $quality);
    }

    private function encodeJpeg(GdImage $image, int $quality): void
    {
        // JPEG has no alpha channel — flatten transparency onto white first.
        $width = imagesx($image);
        $height = imagesy($image);

        $flattened = imagecreatetruecolor($width, $height);
        imagefill($flattened, 0, 0, imagecolorallocate($flattened, 255, 255, 255));
        imagecopy($flattened, $image, 0, 0, 0, 0, $width, $height);

        imagejpeg($flattened, null, $quality);
        imagedestroy($flattened);
    }
}
