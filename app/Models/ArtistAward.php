<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['artist_id', 'year', 'sort_order'])]
class ArtistAward extends Model
{
    protected function casts(): array
    {
        return ['year' => 'integer'];
    }

    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class);
    }

    public function translations(): HasMany
    {
        return $this->hasMany(ArtistAwardTranslation::class);
    }
}
