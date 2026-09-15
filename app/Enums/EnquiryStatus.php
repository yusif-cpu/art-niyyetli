<?php

namespace App\Enums;

enum EnquiryStatus: string
{
    case New = 'new';
    case Read = 'read';
    case Replied = 'replied';
    case Closed = 'closed';
}
