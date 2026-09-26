<?php

namespace App\Models;

use App\Enums\PageType;
use Database\Factories\PageSectionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['page_id', 'key', 'media_id', 'sort_order', 'is_active'])]
class PageSection extends Model
{
    /** @use HasFactory<PageSectionFactory> */
    use HasFactory;

    /**
     * The section keys the public homepage is built around (`HomePage.jsx` looks them up by key): the hero (page
     * heading, document title and description), the "how it works" steps and the closing call to action. They are a
     * stable contract: on the home page these sections are never renamed (they can still be edited, deactivated and
     * reordered), and the frontend falls back gracefully when one is missing. Any other key is allowed and ignored by
     * the homepage.
     */
    public const HOME_KEYS = ['hero', 'steps', 'cta'];

    /** Lower-case letters and digits, with single `-` or `_` between them (`hero`, `how-it-works`, `cta_2`). */
    public const KEY_PATTERN = '/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/D';

    /** @return list<string> the keys a page of this type relies on (empty for pages without a fixed contract) */
    public static function contractKeysFor(?PageType $type): array
    {
        return $type === PageType::Home ? self::HOME_KEYS : [];
    }

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

    public function image(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'media_id');
    }
}
