<?php

namespace Database\Seeders;

use App\Enums\Locale;
use App\Enums\NavRouteKey;
use App\Enums\NavType;
use App\Enums\PageType;
use App\Models\NavigationItem;
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
     * Neutral "coming soon" copy for the singleton pages, in each page's own
     * language — final content is entered by the client from Admin → Pages.
     * The `%s` is replaced with the page title.
     */
    private const PLACEHOLDER_CONTENT = [
        'az' => '%s səhifəsinin məzmunu tezliklə əlavə olunacaq.',
        'en' => 'Content for the "%s" page will be added soon.',
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
     * The 4 special catalogue routes have always rendered in the header, in this
     * fixed order, after the structural pages above — see NavigationBackfiller,
     * which applies the same order when converting existing installs.
     */
    private const HEADER_ROUTES = [
        NavRouteKey::Artworks,
        NavRouteKey::Artists,
        NavRouteKey::Exhibitions,
        NavRouteKey::Articles,
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

            // Create-if-missing only: once the client has edited these pages (content,
            // active flag, navigation order/visibility) a re-run must not reset them.
            $page = Page::query()->firstOrCreate(['type' => $type->value], [
                'is_active' => true,
            ]);

            NavigationItem::query()->firstOrCreate(
                ['placement' => 'header', 'page_id' => $page->id],
                ['nav_type' => NavType::Page->value, 'route_key' => null, 'sort_order' => self::HEADER_ORDER[$type->value], 'is_visible' => true]
            );

            foreach (Locale::cases() as $locale) {
                $title = self::TITLES[$type->value][$locale->value];

                $page->translations()->firstOrCreate(
                    ['locale' => $locale->value],
                    [
                        'slug' => $type->value,
                        'title' => $title,
                        'content' => sprintf(self::PLACEHOLDER_CONTENT[$locale->value], $title),
                    ]
                );
            }

            if ($type === PageType::Home) {
                $this->seedHomeSections($page);
            }
        }

        $this->seedLegalPages();
        $this->seedHeaderRoutes();
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
                ]);

            NavigationItem::query()->updateOrCreate(
                ['placement' => 'footer', 'page_id' => $page->id],
                ['nav_type' => NavType::Page->value, 'route_key' => null, 'sort_order' => $sortOrder, 'is_visible' => true]
            );
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

    private function seedHeaderRoutes(): void
    {
        $sortOrder = count(self::HEADER_ORDER);

        foreach (self::HEADER_ROUTES as $routeKey) {
            NavigationItem::query()->updateOrCreate(
                ['placement' => 'header', 'route_key' => $routeKey->value],
                ['nav_type' => NavType::Route->value, 'page_id' => null, 'sort_order' => $sortOrder, 'is_visible' => true]
            );
            $sortOrder++;
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
