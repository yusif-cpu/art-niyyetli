<?php

namespace App\Models;

use App\Enums\ExhibitionStatus;
use App\Enums\ExhibitionType;
use App\Support\Seo\Concerns\HasSeoOverride;
use Database\Factories\ExhibitionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['type', 'status', 'start_date', 'end_date', 'is_active'])]
class Exhibition extends Model
{
    /** @use HasFactory<ExhibitionFactory> */
    use HasFactory, HasSeoOverride, SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => ExhibitionType::class,
            'status' => ExhibitionStatus::class,
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(ExhibitionTranslation::class);
    }

    public function artists(): BelongsToMany
    {
        return $this->belongsToMany(Artist::class, 'exhibition_artists')->withPivot('sort_order');
    }

    public function artworks(): BelongsToMany
    {
        return $this->belongsToMany(Artwork::class, 'exhibition_artworks')->withPivot('sort_order');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ExhibitionMedium::class);
    }
}
