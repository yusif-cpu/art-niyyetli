<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'sort_order', 'is_active'])]
class Medium extends Model
{
    protected $table = 'mediums';

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(MediumTranslation::class);
    }
}
