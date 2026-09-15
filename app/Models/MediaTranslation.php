<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['media_id', 'locale', 'alt_text'])]
class MediaTranslation extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
