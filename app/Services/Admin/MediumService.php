<?php

namespace App\Services\Admin;

use App\Exceptions\CatalogTermInUseException;
use App\Models\Medium;
use Illuminate\Support\Facades\DB;

class MediumService
{
    public function create(array $data): Medium
    {
        $translations = $data['translations'];
        unset($data['translations']);

        $data['sort_order'] ??= ((int) Medium::query()->max('sort_order')) + 1;

        return DB::transaction(function () use ($data, $translations) {
            $medium = Medium::create($data);
            $this->syncTranslations($medium, $translations);

            return $medium->fresh();
        });
    }

    public function update(Medium $medium, array $data): Medium
    {
        $translations = $data['translations'] ?? null;
        unset($data['translations']);

        // A null sort_order (the field is nullable in the request) means "leave it alone", never "clear it".
        if (array_key_exists('sort_order', $data) && $data['sort_order'] === null) {
            unset($data['sort_order']);
        }

        return DB::transaction(function () use ($medium, $data, $translations) {
            $medium->update($data);

            if ($translations !== null) {
                $this->syncTranslations($medium, $translations);
            }

            return $medium->fresh();
        });
    }

    public function delete(Medium $medium): void
    {
        if ($medium->artworks()->withTrashed()->exists()) {
            throw new CatalogTermInUseException('This medium is used by artworks and cannot be deleted; deactivate it instead.');
        }

        $medium->delete();
    }

    private function syncTranslations(Medium $medium, array $translations): void
    {
        foreach ($translations as $translation) {
            $medium->translations()->updateOrCreate(
                ['locale' => $translation['locale']],
                ['name' => $translation['name']]
            );
        }
    }
}
