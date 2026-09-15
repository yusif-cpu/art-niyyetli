<?php

namespace App\Models;

use App\Enums\ArtworkAvailability;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'artist_id', 'medium_id', 'genre_id', 'year_created', 'width_cm', 'height_cm',
    'price', 'show_price', 'availability', 'year_sold', 'inventory_code', 'certificate',
    'frame_condition', 'delivery_note', 'featured', 'show_on_wall', 'sort_order', 'is_active',
])]
class Artwork extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'width_cm' => 'decimal:2',
            'height_cm' => 'decimal:2',
            'aspect_ratio' => 'decimal:6',
            'price' => 'decimal:2',
            'show_price' => 'boolean',
            'availability' => ArtworkAvailability::class,
            'certificate' => 'boolean',
            'featured' => 'boolean',
            'show_on_wall' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $artwork): void {
            if ($artwork->width_cm && $artwork->height_cm) {
                $artwork->aspect_ratio = round((float) $artwork->width_cm / (float) $artwork->height_cm, 6);
            }
        });
    }

    public function artist(): BelongsTo
    {
        return $this->belongsTo(Artist::class);
    }

    public function medium(): BelongsTo
    {
        return $this->belongsTo(Medium::class);
    }

    public function genre(): BelongsTo
    {
        return $this->belongsTo(Genre::class);
    }

    public function translations(): HasMany
    {
        return $this->hasMany(ArtworkTranslation::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ArtworkImage::class);
    }

    public function enquiries(): HasMany
    {
        return $this->hasMany(Enquiry::class);
    }

    public function exhibitions(): BelongsToMany
    {
        return $this->belongsToMany(Exhibition::class, 'exhibition_artworks')->withPivot('sort_order');
    }
}
