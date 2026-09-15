<?php

namespace App\Services\Admin;

use App\Exceptions\MediaProcessingFailedException;
use App\Models\Media;
use App\Models\MediaVariant;
use GdImage;
use Illuminate\Support\Facades\Storage;

class MediaVariantGenerator
{
    public function generate(Media $media, string $sourceBinary): void
    {
        $source = @imagecreatefromstring($sourceBinary);

        if (! $source instanceof GdImage) {
            throw new MediaProcessingFailedException('Unable to decode the source image for variant generation.');
        }

        try {
            foreach (config('media.variants') as $variantName => $variantConfig) {
                [$width, $height] = $this->scaledDimensions(
                    imagesx($source), imagesy($source), $variantConfig['max_dimension']
                );

                $resized = $this->resample($source, $width, $height);

                try {
                    foreach (config('media.formats') as $formatName => $formatConfig) {
                        $this->storeVariant($media, $resized, $variantName, $formatName, $formatConfig, $width, $height);
                    }
                } finally {
                    imagedestroy($resized);
                }
            }
        } finally {
            imagedestroy($source);
        }
    }

    private function storeVariant(Media $media, GdImage $image, string $variantName, string $formatName, array $formatConfig, int $width, int $height): void
    {
        $binary = $this->encode($image, $formatName, $formatConfig['quality']);
        $disk = config('media.disks.public');
        $path = "media/{$media->id}/{$variantName}-{$formatName}.{$formatConfig['extension']}";

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
