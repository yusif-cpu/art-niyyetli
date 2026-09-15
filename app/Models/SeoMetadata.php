<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable(['seoable_type', 'seoable_id', 'locale', 'title', 'description', 'og_image_id'])]
class SeoMetadata extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function seoable(): MorphTo
    {
        return $this->morphTo();
    }

    public function ogImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'og_image_id');
    }
}
