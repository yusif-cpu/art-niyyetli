<?php

namespace App\Models;

use App\Enums\MediaType;
use Database\Factories\MediaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['type', 'disk', 'path', 'original_filename', 'mime_type', 'size_bytes', 'original_width', 'original_height', 'aspect_ratio'])]
class Media extends Model
{
    /** @use HasFactory<MediaFactory> */
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => MediaType::class,
            'size_bytes' => 'integer',
            'original_width' => 'integer',
            'original_height' => 'integer',
            'aspect_ratio' => 'decimal:6',
        ];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(MediaTranslation::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(MediaVariant::class);
    }

    public function artworkImages(): HasMany
    {
        return $this->hasMany(ArtworkImage::class);
    }

    public function representingArtists(): HasMany
    {
        return $this->hasMany(Artist::class, 'representation_image_id');
    }

    public function exhibitionMedia(): HasMany
    {
        return $this->hasMany(ExhibitionMedium::class);
    }

    public function seoMetadata(): HasMany
    {
        return $this->hasMany(SeoMetadata::class, 'og_image_id');
    }

    public function articles(): BelongsToMany
    {
        return $this->belongsToMany(Article::class, 'article_media')->withPivot('sort_order');
    }
}
