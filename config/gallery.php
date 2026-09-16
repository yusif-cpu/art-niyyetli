<?php

return [

    // artworks has no currency column (single-currency gallery); the public
    // API needs a currency alongside every price, so it comes from config
    // rather than a schema change (see Phase 09 plan Task 1).
    'currency' => env('GALLERY_CURRENCY', 'AZN'),

];
