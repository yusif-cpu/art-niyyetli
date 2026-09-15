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
            ['key' => 'artist_submission', 'sort_order' => 1, 'az' => 'Rəssam müraciəti', 'en' => 'Artist submission'],
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
