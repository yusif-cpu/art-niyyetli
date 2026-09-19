<?php

namespace App\Services\Admin;

use App\Enums\ArtworkAvailability;
use App\Exceptions\ArtworkDeletionNotAllowedException;
use App\Models\Artwork;
use App\Models\ArtworkImage;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ArtworkService
{
    private const MAX_INVENTORY_CODE_ATTEMPTS = 10;

    public function __construct(private InventoryCodeGenerator $inventoryCodeGenerator) {}

    public function create(array $data): Artwork
    {
        $manualCode = $data['inventory_code'] ?? null;
        $year = (int) $data['year_created'];
        $translations = $data['translations'];
        $images = $data['images'] ?? [];
        unset($data['translations'], $data['images'], $data['inventory_code'], $data['youtube_url']);

        $sequence = $this->inventoryCodeGenerator->suggestSequenceStart($year);
        $attempt = 0;

        while (true) {
            $attempt++;
            $code = $manualCode ?? $this->inventoryCodeGenerator->format($year, $sequence + $attempt - 1);

            try {
                return DB::transaction(function () use ($data, $code, $translations, $images) {
                    $artwork = Artwork::create([...$data, 'inventory_code' => $code]);
                    $this->syncTranslations($artwork, $translations);
                    $this->syncImages($artwork, $images);

                    return $artwork->fresh();
                });
            } catch (UniqueConstraintViolationException $e) {
                if ($manualCode !== null) {
                    throw ValidationException::withMessages([
                        'inventory_code' => ['This inventory code is already in use.'],
                    ]);
                }

                if ($attempt >= self::MAX_INVENTORY_CODE_ATTEMPTS) {
                    throw $e;
                }
            }
        }
    }

    public function update(Artwork $artwork, array $data): Artwork
    {
        $translations = $data['translations'] ?? null;
        $images = array_key_exists('images', $data) ? $data['images'] : null;
        unset($data['translations'], $data['images'], $data['youtube_url']);

        return DB::transaction(function () use ($artwork, $data, $translations, $images) {
            $artwork->update($data);

            if ($translations !== null) {
                $this->syncTranslations($artwork, $translations);
            }

            if ($images !== null) {
                $this->syncImages($artwork, $images);
            }

            return $artwork->fresh();
        });
    }

    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items) {
            foreach ($items as $item) {
                Artwork::whereKey($item['id'])->update(['sort_order' => $item['sort_order']]);
            }
        });
    }

    public function delete(Artwork $artwork): void
    {
        if ($artwork->availability === ArtworkAvailability::Sold) {
            throw new ArtworkDeletionNotAllowedException('Sold artworks carry historical/SEO value and cannot be deleted; deactivate it instead.');
        }

        if ($artwork->enquiries()->exists()) {
            throw new ArtworkDeletionNotAllowedException('This artwork has related enquiries and cannot be deleted; deactivate it instead.');
        }

        $artwork->delete();
    }

    private function syncTranslations(Artwork $artwork, array $translations): void
    {
        foreach ($translations as $translation) {
            $artwork->translations()->updateOrCreate(
                ['locale' => $translation['locale']],
                [
                    'slug' => $translation['slug'],
                    'title' => $translation['title'],
                    'short_description' => $translation['short_description'],
                    'provenance' => $translation['provenance'],
                ]
            );
        }
    }

    private function syncImages(Artwork $artwork, array $images): void
    {
        $mainCount = collect($images)->filter(fn ($i) => (bool) ($i['is_main'] ?? false))->count();

        if ($mainCount > 1) {
            throw ValidationException::withMessages(['images' => ['Only one image may be marked as main.']]);
        }

        $keepIds = [];

        foreach ($images as $image) {
            $id = $image['id'] ?? null;

            if ($id !== null) {
                $existing = ArtworkImage::find($id);

                if (! $existing || $existing->artwork_id !== $artwork->id) {
                    throw ValidationException::withMessages([
                        'images' => ["Image {$id} does not belong to this artwork."],
                    ]);
                }

                $existing->update([
                    'media_id' => $image['media_id'],
                    'type' => $image['type'],
                    'sort_order' => $image['sort_order'] ?? 0,
                    'is_main' => (bool) ($image['is_main'] ?? false),
                ]);
                $keepIds[] = $existing->id;
            } else {
                $created = $artwork->images()->create([
                    'media_id' => $image['media_id'],
                    'type' => $image['type'],
                    'sort_order' => $image['sort_order'] ?? 0,
                    'is_main' => (bool) ($image['is_main'] ?? false),
                ]);
                $keepIds[] = $created->id;
            }
        }

        $artwork->images()->whereNotIn('id', $keepIds)->delete();
    }
}
