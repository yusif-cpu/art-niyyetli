<?php

return [

    // artworks has no currency column (single-currency gallery); the public
    // API needs a currency alongside every price, so it comes from config
    // rather than a schema change (see Phase 09 plan Task 1).
    'currency' => env('GALLERY_CURRENCY', 'AZN'),

    // Fallback recipient for new-enquiry notifications when no
    // contact_email site setting has been configured by an admin.
    'enquiry_notification_email' => env('ENQUIRY_NOTIFICATION_EMAIL'),

    // wa.me phone number (digits only, e.g. 994501234567). Null hides the
    // WhatsApp CTA on the public API's artwork detail response.
    'whatsapp_number' => env('GALLERY_WHATSAPP_NUMBER'),

    // Whether the public enquiry endpoint accepts enquiries for artworks
    // already marked sold. Off by default per Phase 10 spec §6.
    'allow_sold_enquiries' => env('ALLOW_SOLD_ENQUIRIES', false),

];
