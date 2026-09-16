<?php

namespace Database\Factories;

use App\Models\Page;
use App\Models\PageSection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PageSection>
 */
class PageSectionFactory extends Factory
{
    protected $model = PageSection::class;

    public function definition(): array
    {
        return [
            'page_id' => Page::factory(),
            'key' => fake()->unique()->slug(2),
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
