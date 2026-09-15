<?php

namespace App\Models;

use App\Enums\ExhibitionMediaType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['exhibition_id', 'media_id', 'type', 'sort_order'])]
class ExhibitionMedium extends Model
{
    protected $table = 'exhibition_media';

    protected function casts(): array
    {
        return ['type' => ExhibitionMediaType::class];
    }

    public function exhibition(): BelongsTo
    {
        return $this->belongsTo(Exhibition::class);
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
