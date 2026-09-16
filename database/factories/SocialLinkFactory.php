<?php

namespace Database\Factories;

use App\Models\SocialLink;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SocialLink>
 */
class SocialLinkFactory extends Factory
{
    protected $model = SocialLink::class;

    public function definition(): array
    {
        return [
            'platform' => 'instagram',
            'url' => 'https://instagram.com/'.fake()->userName(),
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
