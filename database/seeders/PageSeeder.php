<?php

namespace Database\Seeders;

use App\Enums\Locale;
use App\Enums\PageType;
use App\Models\Page;
use App\Models\PageTranslation;
use Illuminate\Database\Seeder;

class PageSeeder extends Seeder
{
    private const TITLES = [
        'home' => ['az' => 'Ana səhifə', 'en' => 'Home'],
        'about' => ['az' => 'Haqqımızda', 'en' => 'About'],
        'collectors' => ['az' => 'Kolleksionerlər üçün', 'en' => 'For collectors'],
        'contact' => ['az' => 'Əlaqə', 'en' => 'Contact'],
    ];

    /**
     * Default header order for the singleton pages, matching the site's
     * established navigation sequence. Admins can reorder these afterward.
     */
    private const HEADER_ORDER = [
        'home' => 0,
        'about' => 1,
        'collectors' => 2,
        'contact' => 3,
    ];

    /**
     * Legal/content pages: unlike the singleton types above, `custom` is not
     * looped as a single page — it supports any number of pages, each
     * identified by its own slug rather than by `type`.
     */
    private const LEGAL_PAGES = [
        'privacy-policy' => [
            'az' => ['title' => 'Məxfilik siyasəti', 'content' => '[PLACEHOLDER] Bu səhifənin son hüquqi mətni müştəri tərəfindən təmin ediləcək.'],
            'en' => ['title' => 'Privacy Policy', 'content' => '[PLACEHOLDER] Final legal copy for this page will be supplied by the client.'],
        ],
        'terms' => [
            'az' => ['title' => 'İstifadə şərtləri', 'content' => '[PLACEHOLDER] Bu səhifənin son hüquqi mətni müştəri tərəfindən təmin ediləcək.'],
            'en' => ['title' => 'Terms & Conditions', 'content' => '[PLACEHOLDER] Final legal copy for this page will be supplied by the client.'],
        ],
        'shipping-returns' => [
            'az' => ['title' => 'Çatdırılma və qaytarılma', 'content' => '[PLACEHOLDER] Bu səhifənin son hüquqi mətni müştəri tərəfindən təmin ediləcək.'],
            'en' => ['title' => 'Shipping & Returns', 'content' => '[PLACEHOLDER] Final legal copy for this page will be supplied by the client.'],
        ],
        'copyright' => [
            'az' => ['title' => 'Müəllif hüquqları', 'content' => '[PLACEHOLDER] Bu səhifənin son hüquqi mətni müştəri tərəfindən təmin ediləcək.'],
            'en' => ['title' => 'Copyright', 'content' => '[PLACEHOLDER] Final legal copy for this page will be supplied by the client.'],
        ],
    ];

    public function run(): void
    {
        foreach (PageType::cases() as $type) {
            if ($type === PageType::Custom) {
                continue;
            }

            $page = Page::query()->updateOrCreate(['type' => $type->value], [
                'is_active' => true,
                'nav_placement' => 'header',
                'sort_order' => self::HEADER_ORDER[$type->value],
            ]);

            foreach (Locale::cases() as $locale) {
                $page->translations()->updateOrCreate(
                    ['locale' => $locale->value],
                    [
                        'slug' => $type->value,
                        'title' => self::TITLES[$type->value][$locale->value],
                        'content' => self::TITLES[$type->value][$locale->value].' səhifəsinin məzmunu tezliklə əlavə olunacaq.',
                    ]
                );
            }

            if ($type === PageType::Home) {
                $this->seedHomeSections($page);
            }
        }

        $this->seedLegalPages();
    }

    private function seedLegalPages(): void
    {
        $sortOrder = 0;

        foreach (self::LEGAL_PAGES as $slug => $locales) {
            $existing = PageTranslation::query()->where('slug', $slug)->first();
            $page = $existing
                ? Page::query()->find($existing->page_id)
                : Page::query()->create([
                    'type' => PageType::Custom->value,
                    'is_active' => true,
                    'nav_placement' => 'footer',
                    'sort_order' => $sortOrder,
                ]);
            $sortOrder++;

            foreach (Locale::cases() as $locale) {
                $page->translations()->updateOrCreate(
                    ['locale' => $locale->value],
                    [
                        'slug' => $slug,
                        'title' => $locales[$locale->value]['title'],
                        'content' => $locales[$locale->value]['content'],
                    ]
                );
            }
        }
    }

    private function seedHomeSections(Page $page): void
    {
        $sections = [
            'hero' => [
                'sort_order' => 0,
                'az' => ['heading' => 'ArtNiyyətli', 'body' => 'Müasir Azərbaycan sənətini kəşf edin.'],
                'en' => ['heading' => 'ArtNiyyətli', 'body' => 'Discover contemporary Azerbaijani art.'],
            ],
            'steps' => [
                'sort_order' => 1,
                'az' => [
                    'heading' => 'Necə işləyir',
                    'body' => 'Əsəri kəşf edin, sənətkarla tanış olun, sorğu göndərin, əsəri əldə edin.',
                ],
                'en' => [
                    'heading' => 'How it works',
                    'body' => 'Discover the work, meet the artist, send an enquiry, take the work home.',
                ],
            ],
            'cta' => [
                'sort_order' => 2,
                'az' => ['heading' => 'Bizimlə əlaqə saxlayın', 'body' => 'Suallarınız var? Bizə yazın.'],
                'en' => ['heading' => 'Get in touch', 'body' => 'Have questions? Reach out to us.'],
            ],
        ];

        foreach ($sections as $key => $section) {
            $pageSection = $page->sections()->updateOrCreate(
                ['key' => $key],
                ['sort_order' => $section['sort_order'], 'is_active' => true]
            );

            foreach (['az', 'en'] as $locale) {
                $pageSection->translations()->updateOrCreate(
                    ['locale' => $locale],
                    $section[$locale]
                );
            }
        }
    }
}
