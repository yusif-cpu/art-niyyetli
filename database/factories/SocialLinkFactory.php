<?php

namespace Database\Factories;

use App\Enums\LogoDisplayMode;
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
            'logo_media_id' => null,
            'display_mode' => LogoDisplayMode::LogoText,
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
