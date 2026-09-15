<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['page_section_id', 'locale', 'heading', 'body'])]
class PageSectionTranslation extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function pageSection(): BelongsTo
    {
        return $this->belongsTo(PageSection::class);
    }
}
