<?php

return [

    'max_upload_kb' => 10 * 1024,

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
