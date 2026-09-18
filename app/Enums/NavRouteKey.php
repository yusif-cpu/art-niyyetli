<?php

namespace App\Enums;

enum NavRouteKey: string
{
    case Artworks = 'artworks';
    case Artists = 'artists';
    case Exhibitions = 'exhibitions';
    case Articles = 'articles';

    public function href(): string
    {
        return match ($this) {
            self::Artworks => '/artworks',
            self::Artists => '/artists',
            self::Exhibitions => '/exhibitions',
            self::Articles => '/articles',
        };
    }
}
