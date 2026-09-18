<?php

namespace App\Enums;

enum PageNavPlacement: string
{
    case Header = 'header';
    case Footer = 'footer';
    case None = 'none';
}
