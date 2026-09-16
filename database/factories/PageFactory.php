<?php

namespace Database\Factories;

use App\Enums\PageType;
use App\Models\Page;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Page>
 */
class PageFactory extends Factory
{
    protected $model = Page::class;

    public function definition(): array
    {
        return [
            'type' => PageType::Home->value,
            'is_active' => true,
        ];
    }
}
