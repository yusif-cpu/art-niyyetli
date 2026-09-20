<?php

return [

    'max_upload_kb' => 10 * 1024,

    // Largest image an upload may contain, read from the file header BEFORE the image is decoded (GD needs about
    // 4 bytes per pixel to decode, plus working copies, no matter how small the file is on disk). Over either limit
    // the upload is refused with a validation error instead of exhausting PHP's memory and failing with a 500.
    //
    // Measured on PHP 8.4 + GD through MediaService::upload() with memory_limit = 256M (docker/php/conf.d/local.ini):
    //   JPEG   12 MP 133 MB | 24 MP 173 MB | 36 MP 233 MB | 44 MP 253 MB | 48 MP and up: fatal memory error
    //   PNG    24 MP 189 MB | 28 MP 216 MB | 32 MP 242 MB | 34 MP and up: fatal memory error
    // (peak memory grows by roughly 3.8 MB per megapixel for JPEG and 6.6 MB for PNG on top of about 30-90 MB).
    // 28 MP is about 60 % of the JPEG failure point (and 82 % of the PNG one), keeps ordinary 24 MP camera files (6000 x 4000) working with
    // headroom, and every size up to it was measured to succeed in both formats. To accept larger images raise
    // PHP's memory_limit and MEDIA_MAX_PIXELS together. The longest-edge limit only stops absurd shapes; even a
    // 65 000 x 60 px image decoded fine (42 MB), so it is not memory-driven.
    'max_pixels' => (int) env('MEDIA_MAX_PIXELS', 28_000_000),
    'max_edge_px' => (int) env('MEDIA_MAX_EDGE', 12_000),

    // Real (server-detected) MIME type => safe storage extension.
    // Client-supplied MIME/extension is never trusted; this map is only
    // consulted after the actual bytes have been decoded successfully.
    'allowed_mimes' => [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ],

    'disks' => [
        // Originals: not web-exposed (the "local" disk root is
        // storage/app/private, outside the public/storage symlink).
        'original' => env('MEDIA_ORIGINAL_DISK', 'local'),
        // Variants: web-servable today via the storage symlink, and the
        // disk driver can be swapped to "s3" for CDN delivery without any
        // code change.
        'public' => env('MEDIA_PUBLIC_DISK', 'public'),
    ],

    // Longest-edge caps in pixels. Not specified in the brief — these are
    // implementation decisions for a gallery/artwork-photography site:
    // thumbnail for admin grids/lists, catalogue for the public works grid,
    // detail for the artwork page, full for zoom/lightbox. Originals larger
    // than these are downscaled; smaller originals are never upscaled.
    'variants' => [
        'thumbnail' => ['max_dimension' => 300],
        'catalogue' => ['max_dimension' => 800],
        'detail' => ['max_dimension' => 1600],
        'full' => ['max_dimension' => 2400],
    ],

    // Modern format (WebP, reliable on this GD build) + JPEG fallback.
    // AVIF is not generated: this GD build has no AVIF support and adding
    // it is out of scope for this phase.
    'formats' => [
        'webp' => ['extension' => 'webp', 'mime' => 'image/webp', 'quality' => 82],
        'jpeg' => ['extension' => 'jpg', 'mime' => 'image/jpeg', 'quality' => 85],
    ],

];
