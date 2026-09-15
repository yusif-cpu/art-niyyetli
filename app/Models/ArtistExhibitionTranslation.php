<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['artist_exhibition_id', 'locale', 'title', 'venue'])]
class ArtistExhibitionTranslation extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function artistExhibition(): BelongsTo
    {
        return $this->belongsTo(ArtistExhibition::class);
    }
}
