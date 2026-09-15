<?php

namespace App\Models;

use Database\Factories\ArtistFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['representation_image_id', 'birth_year', 'sort_order', 'is_active'])]
class Artist extends Model
{
    /** @use HasFactory<ArtistFactory> */
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(ArtistTranslation::class);
    }

    public function exhibitions(): HasMany
    {
        return $this->hasMany(ArtistExhibition::class);
    }

    public function awards(): HasMany
    {
        return $this->hasMany(ArtistAward::class);
    }

    public function representationImage(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'representation_image_id');
    }

    public function artworks(): HasMany
    {
        return $this->hasMany(Artwork::class);
    }

    public function exhibitionAppearances(): BelongsToMany
    {
        return $this->belongsToMany(Exhibition::class, 'exhibition_artists')->withPivot('sort_order');
    }
}
