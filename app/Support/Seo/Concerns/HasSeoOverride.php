<?php

namespace App\Support\Seo\Concerns;

use App\Enums\Locale;
use App\Models\SeoMetadata;
use Illuminate\Database\Eloquent\Relations\MorphMany;

trait HasSeoOverride
{
    public function seoMetadata(): MorphMany
    {
        return $this->morphMany(SeoMetadata::class, 'seoable');
    }

    public function seoOverride(Locale $locale): ?SeoMetadata
    {
        if ($this->relationLoaded('seoMetadata')) {
            return $this->seoMetadata->firstWhere('locale', $locale);
        }

        return $this->seoMetadata()->where('locale', $locale)->first();
    }
}
