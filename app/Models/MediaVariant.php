<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['media_id', 'variant', 'disk', 'path', 'mime_type', 'size_bytes', 'width', 'height'])]
class MediaVariant extends Model
{
    protected function casts(): array
    {
        return ['size_bytes' => 'integer', 'width' => 'integer', 'height' => 'integer'];
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
