<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['article_id', 'locale', 'slug', 'title', 'short_text', 'content'])]
class ArticleTranslation extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }
}
