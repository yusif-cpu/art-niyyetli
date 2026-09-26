<?php

namespace App\Services\Admin;

use App\Support\Seo\Concerns\HasSeoOverride;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes the per-locale SEO overrides (seo_metadata rows) of a model that uses HasSeoOverride.
 */
class SeoMetadataService
{
    /**
     * @param  Model&HasSeoOverride  $model
     * @param  array<int, array{locale: string, title?: ?string, description?: ?string, og_image_id?: ?int}>  $entries
     */
    public function sync(Model $model, array $entries): void
    {
        foreach ($entries as $entry) {
            $values = [
                'title' => $this->blankToNull($entry['title'] ?? null),
                'description' => $this->blankToNull($entry['description'] ?? null),
                'og_image_id' => $entry['og_image_id'] ?? null,
            ];

            $rows = $model->seoMetadata()->where('locale', $entry['locale']);

            if (! array_filter($values, fn ($value) => $value !== null)) {
                $rows->delete();

                continue;
            }

            $model->seoMetadata()->updateOrCreate(['locale' => $entry['locale']], $values);
        }
    }

    private function blankToNull(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
