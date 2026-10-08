<?php

namespace App\Models;

use App\Enums\NavPlacement;
use App\Enums\NavRouteKey;
use App\Enums\NavType;
use Database\Factories\NavigationItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class NavigationItem extends Model
{
    /** @use HasFactory<NavigationItemFactory> */
    use HasFactory;

    protected $fillable = ['placement', 'nav_type', 'page_id', 'route_key', 'sort_order', 'is_visible'];

    protected static function booted(): void
    {
        static::saving(function (NavigationItem $item): void {
            if ($item->nav_type === NavType::Page) {
                if ($item->page_id === null || $item->route_key !== null) {
                    throw new LogicException('A page navigation item must have a page_id and no route_key.');
                }
            } elseif ($item->nav_type === NavType::Route) {
                if ($item->route_key === null || $item->page_id !== null) {
                    throw new LogicException('A route navigation item must have a route_key and no page_id.');
                }
            }
        });
    }

    protected function casts(): array
    {
        return [
            'placement' => NavPlacement::class,
            'nav_type' => NavType::class,
            'route_key' => NavRouteKey::class,
            'is_visible' => 'boolean',
        ];
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class);
    }

    /**
     * Whether the public site currently offers a route (e.g. the journal's /articles): a visible navigation item for
     * it exists, in either placement. The public SPA decides the same way from the navigation payload
     * (useJournalOpen), so the server's HTTP status and sitemap agree with what the visitor is shown.
     */
    public static function routeIsOpen(NavRouteKey $routeKey): bool
    {
        return static::query()
            ->where('nav_type', NavType::Route->value)
            ->where('route_key', $routeKey->value)
            ->where('is_visible', true)
            ->exists();
    }
}
