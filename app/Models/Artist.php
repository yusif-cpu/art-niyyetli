<?php

namespace App\Models;

use App\Support\Seo\Concerns\HasSeoOverride;
use Database\Factories\ArtistFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
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
    use HasFactory, HasSeoOverride, SoftDeletes;

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /**
     * Artists the public site can link to: the AZ translation is the canonical one that every other locale falls
     * back to, so an artist without an AZ slug has no usable public URL.
     *
     * @param  Builder<Artist>  $query
     */
    public function scopeWithUsableAzTranslation(Builder $query): void
    {
        $query->whereHas('translations', fn ($q) => $q->where('locale', 'az')->where('slug', '!=', ''));
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
