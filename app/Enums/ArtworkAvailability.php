<?php

namespace App\Enums;

enum ArtworkAvailability: string
{
    case Available = 'available';
    case Reserved = 'reserved';
    case Sold = 'sold';
}
