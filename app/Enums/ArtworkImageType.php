<?php

namespace App\Enums;

enum ArtworkImageType: string
{
    case Main = 'main';
    case Detail = 'detail';
    case Frame = 'frame';
    case Wall = 'wall';
}
