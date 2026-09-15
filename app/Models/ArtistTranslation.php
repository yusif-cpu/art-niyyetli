<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['artist_id', 'locale', 'slug', 'first_name', 'last_name', 'birth_place', 'direction', 'biography', 'artistic_approach'])]
class ArtistTranslation extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class);
    }
}
