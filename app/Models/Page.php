<?php

namespace App\Models;

use App\Enums\PageNavPlacement;
use App\Enums\PageType;
use App\Support\Seo\Concerns\HasSeoOverride;
use Database\Factories\PageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['type', 'is_active', 'nav_placement', 'sort_order'])]
class Page extends Model
{
    /** @use HasFactory<PageFactory> */
    use HasFactory, HasSeoOverride, SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => PageType::class,
            'is_active' => 'boolean',
            'nav_placement' => PageNavPlacement::class,
        ];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(PageTranslation::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(PageSection::class);
    }

    public function faqs(): HasMany
    {
        return $this->hasMany(Faq::class);
    }
}
