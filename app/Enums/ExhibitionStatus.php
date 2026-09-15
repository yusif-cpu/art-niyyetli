<?php

namespace App\Enums;

enum ExhibitionStatus: string
{
    case Current = 'current';
    case Past = 'past';
    case Upcoming = 'upcoming';
}
