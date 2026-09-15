<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['page_id', 'key', 'sort_order', 'is_active'])]
class PageSection extends Model
{
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class);
    }

    public function translations(): HasMany
    {
        return $this->hasMany(PageSectionTranslation::class);
    }
}
