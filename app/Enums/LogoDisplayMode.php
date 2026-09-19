<?php

namespace App\Enums;

enum LogoDisplayMode: string
{
    case LogoText = 'logo_text';
    case LogoOnly = 'logo_only';
    case TextOnly = 'text_only';
}
