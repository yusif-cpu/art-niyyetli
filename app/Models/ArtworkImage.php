<?php

namespace App\Models;

use App\Enums\ArtworkImageType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['artwork_id', 'media_id', 'type', 'sort_order', 'is_main'])]
class ArtworkImage extends Model
{
    protected function casts(): array
    {
        return [
            'type' => ArtworkImageType::class,
            'is_main' => 'boolean',
        ];
    }

    public function artwork(): BelongsTo
    {
        return $this->belongsTo(Artwork::class);
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
