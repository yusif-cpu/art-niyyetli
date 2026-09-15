<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['platform', 'url', 'sort_order', 'is_active'])]
class SocialLink extends Model
{
    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
