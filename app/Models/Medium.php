<?php

namespace App\Models;

use Database\Factories\MediumFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['slug', 'sort_order', 'is_active'])]
class Medium extends Model
{
    /** @use HasFactory<MediumFactory> */
    use HasFactory;

    protected $table = 'mediums';

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(MediumTranslation::class);
    }

    public function artworks(): HasMany
    {
        return $this->hasMany(Artwork::class);
    }
}
