<?php

namespace App\Services\Admin;

use App\Models\Artist;
use Illuminate\Support\Facades\DB;

class ArtistService
{
    public function create(array $data): Artist
    {
        $translations = $data['translations'];
        $exhibitions = $data['exhibitions'] ?? [];
        $awards = $data['awards'] ?? [];
        unset($data['translations'], $data['exhibitions'], $data['awards']);

        return DB::transaction(function () use ($data, $translations, $exhibitions, $awards) {
            $artist = Artist::create($data);
            $this->syncTranslations($artist, $translations);
            $this->syncExhibitions($artist, $exhibitions);
            $this->syncAwards($artist, $awards);

            return $artist->fresh();
        });
    }

    public function update(Artist $artist, array $data): Artist
    {
        $translations = $data['translations'] ?? null;
        $exhibitions = array_key_exists('exhibitions', $data) ? $data['exhibitions'] : null;
        $awards = array_key_exists('awards', $data) ? $data['awards'] : null;
        unset($data['translations'], $data['exhibitions'], $data['awards']);

        return DB::transaction(function () use ($artist, $data, $translations, $exhibitions, $awards) {
            $artist->update($data);

            if ($translations !== null) {
                $this->syncTranslations($artist, $translations);
            }

            if ($exhibitions !== null) {
                $this->syncExhibitions($artist, $exhibitions);
            }

            if ($awards !== null) {
                $this->syncAwards($artist, $awards);
            }

            return $artist->fresh();
        });
    }

    private function syncTranslations(Artist $artist, array $translations): void
    {
        foreach ($translations as $translation) {
            $artist->translations()->updateOrCreate(
                ['locale' => $translation['locale']],
                [
                    'slug' => $translation['slug'],
                    'first_name' => $translation['first_name'],
                    'last_name' => $translation['last_name'],
                    'birth_place' => $translation['birth_place'] ?? null,
                    'direction' => $translation['direction'] ?? null,
                    'biography' => $translation['biography'] ?? null,
                    'artistic_approach' => $translation['artistic_approach'] ?? null,
                ]
            );
        }
    }

    private function syncExhibitions(Artist $artist, array $exhibitions): void
    {
        $artist->exhibitions()->delete();

        foreach ($exhibitions as $index => $exhibition) {
            $record = $artist->exhibitions()->create([
                'year' => $exhibition['year'],
                'sort_order' => $exhibition['sort_order'] ?? $index,
            ]);

            foreach ($exhibition['translations'] as $translation) {
                $record->translations()->create([
                    'locale' => $translation['locale'],
                    'title' => $translation['title'],
                    'venue' => $translation['venue'],
                ]);
            }
        }
    }

    private function syncAwards(Artist $artist, array $awards): void
    {
        $artist->awards()->delete();

        foreach ($awards as $index => $award) {
            $record = $artist->awards()->create([
                'year' => $award['year'],
                'sort_order' => $award['sort_order'] ?? $index,
            ]);

            foreach ($award['translations'] as $translation) {
                $record->translations()->create([
                    'locale' => $translation['locale'],
                    'title' => $translation['title'],
                ]);
            }
        }
    }
}
