<?php

namespace App\Enums;

enum PageType: string
{
    case Home = 'home';
    case About = 'about';
    case Collectors = 'collectors';
    case Contact = 'contact';
    case Custom = 'custom';
}
