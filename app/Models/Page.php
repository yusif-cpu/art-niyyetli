<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['type', 'is_active'])]
class Page extends Model
{
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
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
