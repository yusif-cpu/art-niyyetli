<?php

namespace App\Services\Admin;

use App\Exceptions\CatalogTermInUseException;
use App\Models\Genre;
use Illuminate\Support\Facades\DB;

class GenreService
{
    public function create(array $data): Genre
    {
        $translations = $data['translations'];
        unset($data['translations']);

        $data['sort_order'] ??= ((int) Genre::query()->max('sort_order')) + 1;

        return DB::transaction(function () use ($data, $translations) {
            $genre = Genre::create($data);
            $this->syncTranslations($genre, $translations);

            return $genre->fresh();
        });
    }

    public function update(Genre $genre, array $data): Genre
    {
        $translations = $data['translations'] ?? null;
        unset($data['translations']);

        // A null sort_order (the field is nullable in the request) means "leave it alone", never "clear it".
        if (array_key_exists('sort_order', $data) && $data['sort_order'] === null) {
            unset($data['sort_order']);
        }

        return DB::transaction(function () use ($genre, $data, $translations) {
            $genre->update($data);

            if ($translations !== null) {
                $this->syncTranslations($genre, $translations);
            }

            return $genre->fresh();
        });
    }

    public function delete(Genre $genre): void
    {
        if ($genre->artworks()->withTrashed()->exists()) {
            throw new CatalogTermInUseException('This genre is used by artworks and cannot be deleted; deactivate it instead.');
        }

        $genre->delete();
    }

    private function syncTranslations(Genre $genre, array $translations): void
    {
        foreach ($translations as $translation) {
            $genre->translations()->updateOrCreate(
                ['locale' => $translation['locale']],
                ['name' => $translation['name']]
            );
        }
    }
}
