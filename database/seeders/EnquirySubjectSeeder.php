<?php

namespace Database\Seeders;

use App\Models\EnquirySubject;
use Illuminate\Database\Seeder;

class EnquirySubjectSeeder extends Seeder
{
    public function run(): void
    {
        $subjects = [
            ['key' => 'buy', 'sort_order' => 0, 'az' => 'Əsər almaq', 'en' => 'Buy an artwork'],
            ['key' => 'general_contact', 'sort_order' => 1, 'az' => 'Ümumi əlaqə', 'en' => 'General contact'],
            ['key' => 'artist_submission', 'sort_order' => 2, 'az' => 'Rəssam müraciəti', 'en' => 'Artist submission'],
            ['key' => 'media', 'sort_order' => 3, 'az' => 'Media sorğusu', 'en' => 'Media enquiry'],
            ['key' => 'exhibition_invitation', 'sort_order' => 4, 'az' => 'Sərgi / dəvət', 'en' => 'Exhibition / invitation'],
            ['key' => 'collaboration', 'sort_order' => 5, 'az' => 'Əməkdaşlıq', 'en' => 'Collaboration'],
            ['key' => 'other', 'sort_order' => 2, 'az' => 'Digər', 'en' => 'Other'],
        ];

        foreach ($subjects as $data) {
            $subject = EnquirySubject::query()->updateOrCreate(
                ['key' => $data['key']],
                ['sort_order' => $data['sort_order']]
            );

            foreach (['az', 'en'] as $locale) {
                $subject->translations()->updateOrCreate(
                    ['locale' => $locale],
                    ['name' => $data[$locale]]
                );
            }
        }
    }
}
