<?php

namespace Database\Factories;

use App\Models\Exhibition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Exhibition>
 */
class ExhibitionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'type' => 'exhibition',
            'status' => 'upcoming',
            'start_date' => now()->addMonth(),
            'end_date' => now()->addMonths(2),
            'is_active' => true,
        ];
    }
}
