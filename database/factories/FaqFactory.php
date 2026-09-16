<?php

namespace Database\Factories;

use App\Models\Faq;
use App\Models\Page;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Faq>
 */
class FaqFactory extends Factory
{
    protected $model = Faq::class;

    public function definition(): array
    {
        return [
            'page_id' => Page::factory(),
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
