<?php

namespace Database\Factories;

use App\Models\Medium;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Medium>
 */
class MediumFactory extends Factory
{
    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(2),
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
