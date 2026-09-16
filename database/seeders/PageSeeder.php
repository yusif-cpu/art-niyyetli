<?php

namespace Database\Seeders;

use App\Enums\Locale;
use App\Enums\PageType;
use App\Models\Page;
use Illuminate\Database\Seeder;

class PageSeeder extends Seeder
{
    private const TITLES = [
        'home' => ['az' => 'Ana səhifə', 'en' => 'Home'],
        'about' => ['az' => 'Haqqımızda', 'en' => 'About'],
        'collectors' => ['az' => 'Kolleksionerlər üçün', 'en' => 'For collectors'],
        'contact' => ['az' => 'Əlaqə', 'en' => 'Contact'],
    ];

    public function run(): void
    {
        foreach (PageType::cases() as $type) {
            $page = Page::query()->updateOrCreate(['type' => $type->value], ['is_active' => true]);

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
