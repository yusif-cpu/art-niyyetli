<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['artist_award_id', 'locale', 'title'])]
class ArtistAwardTranslation extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function artistAward(): BelongsTo
    {
        return $this->belongsTo(ArtistAward::class);
    }
}
