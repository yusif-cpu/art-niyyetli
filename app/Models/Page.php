<?php

namespace App\Models;

use App\Enums\PageType;
use App\Support\Seo\Concerns\HasSeoOverride;
use Database\Factories\PageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['type', 'is_active'])]
class Page extends Model
{
    /** @use HasFactory<PageFactory> */
    use HasFactory, HasSeoOverride, SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => PageType::class,
            'is_active' => 'boolean',
        ];
    }

    /**
     * The pages Admin → Pages lists. The "Kolleksionerlər üçün" page is not part of the site: it is kept
     * (inactive, unlinked) but hidden from the list while inactive. It is still reachable by id
     * (`GET`/`PUT /admin/pages/{id}`), and shows up again in the list once it is reactivated.
     *
     * @param  Builder<Page>  $query
     */
    public function scopeListedInAdmin(Builder $query): void
    {
        $query->where(fn ($q) => $q->where('type', '!=', PageType::Collectors->value)->orWhere('is_active', true));
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

    public function navigationItems(): HasMany
    {
        return $this->hasMany(NavigationItem::class);
    }
}
