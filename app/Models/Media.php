<?php

namespace App\Models;

use App\Enums\MediaType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['type', 'disk', 'path', 'original_filename', 'mime_type', 'size_bytes', 'original_width', 'original_height', 'aspect_ratio'])]
class Media extends Model
{
    use SoftDeletes;

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
}
