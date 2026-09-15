<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['price_range_id', 'locale', 'name'])]
class PriceRangeTranslation extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function priceRange(): BelongsTo
    {
        return $this->belongsTo(PriceRange::class);
    }
}
