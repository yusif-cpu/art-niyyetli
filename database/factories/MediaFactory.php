<?php

namespace Database\Factories;

use App\Models\Media;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Media>
 */
class MediaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'type' => 'image',
            'disk' => 'public',
            'path' => fake()->uuid().'.jpg',
            'original_filename' => fake()->uuid().'.jpg',
            'mime_type' => 'image/jpeg',
            'size_bytes' => fake()->numberBetween(50_000, 5_000_000),
            'original_width' => 1600,
            'original_height' => 1200,
            'aspect_ratio' => 1.333333,
        ];
    }
}
