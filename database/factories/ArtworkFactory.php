<?php

namespace Database\Factories;

use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Genre;
use App\Models\Medium;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Artwork>
 */
class ArtworkFactory extends Factory
{
    public function definition(): array
    {
        return [
            'artist_id' => Artist::factory(),
            'medium_id' => Medium::factory(),
            'genre_id' => Genre::factory(),
            'year_created' => fake()->numberBetween(1990, (int) date('Y')),
            'width_cm' => fake()->randomFloat(2, 20, 200),
            'height_cm' => fake()->randomFloat(2, 20, 200),
            'price' => fake()->randomFloat(2, 100, 50000),
            'inventory_code' => 'AN-TEST-'.fake()->unique()->numerify('######'),
        ];
    }
}
