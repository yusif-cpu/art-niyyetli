<?php

namespace Database\Factories;

use App\Models\Article;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Article>
 */
class ArticleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'type' => 'news',
            'status' => 'draft',
            'published_at' => null,
            'is_active' => true,
        ];
    }
}
