<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['exhibition_id', 'locale', 'slug', 'title', 'venue', 'short_text', 'full_text'])]
class ExhibitionTranslation extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function exhibition(): BelongsTo
    {
        return $this->belongsTo(Exhibition::class);
    }
}
