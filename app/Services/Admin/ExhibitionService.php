<?php

namespace App\Services\Admin;

use App\Enums\ExhibitionStatus;
use App\Exceptions\ExhibitionDeletionNotAllowedException;
use App\Models\Exhibition;
use App\Models\ExhibitionMedium;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExhibitionService
{
    public function __construct(private SeoMetadataService $seo) {}

    public function create(array $data): Exhibition
    {
        $translations = $data['translations'];
        $artists = $data['artists'] ?? [];
        $artworks = $data['artworks'] ?? [];
        $media = $data['media'] ?? [];
        $seo = $data['seo'] ?? null;
        unset($data['translations'], $data['artists'], $data['artworks'], $data['media'], $data['youtube_url'], $data['seo']);

        return DB::transaction(function () use ($data, $translations, $artists, $artworks, $media, $seo) {
            $exhibition = Exhibition::create($data);

            $this->syncTranslations($exhibition, $translations);
            $this->syncArtists($exhibition, $artists);
            $this->syncArtworks($exhibition, $artworks);
            $this->syncMedia($exhibition, $media);

            if ($seo !== null) {
                $this->seo->sync($exhibition, $seo);
            }

            return $exhibition->fresh();
        });
    }

    public function update(Exhibition $exhibition, array $data): Exhibition
    {
        $translations = $data['translations'] ?? null;
        $artists = array_key_exists('artists', $data) ? $data['artists'] : null;
        $artworks = array_key_exists('artworks', $data) ? $data['artworks'] : null;
        $media = array_key_exists('media', $data) ? $data['media'] : null;
        $seo = $data['seo'] ?? null;
        unset($data['translations'], $data['artists'], $data['artworks'], $data['media'], $data['youtube_url'], $data['seo']);

        return DB::transaction(function () use ($exhibition, $data, $translations, $artists, $artworks, $media, $seo) {
            $exhibition->update($data);

            if ($translations !== null) {
                $this->syncTranslations($exhibition, $translations);
            }

            if ($artists !== null) {
                $this->syncArtists($exhibition, $artists);
            }

            if ($artworks !== null) {
                $this->syncArtworks($exhibition, $artworks);
            }

            if ($media !== null) {
                $this->syncMedia($exhibition, $media);
            }

            if ($seo !== null) {
                $this->seo->sync($exhibition, $seo);
            }

            return $exhibition->fresh();
        });
    }

    public function delete(Exhibition $exhibition): void
    {
        if ($exhibition->status === ExhibitionStatus::Past) {
            throw new ExhibitionDeletionNotAllowedException('Past exhibitions carry historical/SEO value and cannot be deleted; deactivate it instead.');
        }

        $exhibition->delete();
    }

    private function syncTranslations(Exhibition $exhibition, array $translations): void
    {
        foreach ($translations as $translation) {
            $exhibition->translations()->updateOrCreate(
                ['locale' => $translation['locale']],
                [
                    'slug' => $translation['slug'],
                    'title' => $translation['title'],
                    'venue' => $translation['venue'],
                    'short_text' => $translation['short_text'],
                    'full_text' => $translation['full_text'],
                ]
            );
        }
    }

    private function syncArtists(Exhibition $exhibition, array $artists): void
    {
        $map = collect($artists)->mapWithKeys(fn ($artist) => [
            $artist['artist_id'] => ['sort_order' => $artist['sort_order'] ?? 0],
        ])->all();

        $exhibition->artists()->sync($map);
    }

    private function syncArtworks(Exhibition $exhibition, array $artworks): void
    {
        $map = collect($artworks)->mapWithKeys(fn ($artwork) => [
            $artwork['artwork_id'] => ['sort_order' => $artwork['sort_order'] ?? 0],
        ])->all();

        $exhibition->artworks()->sync($map);
    }

    private function syncMedia(Exhibition $exhibition, array $media): void
    {
        $keepIds = [];

        foreach ($media as $item) {
            $id = $item['id'] ?? null;

            if ($id !== null) {
                $existing = ExhibitionMedium::find($id);

                if (! $existing || $existing->exhibition_id !== $exhibition->id) {
                    throw ValidationException::withMessages([
                        'media' => ["Media {$id} does not belong to this exhibition."],
                    ]);
                }

                $existing->update([
                    'media_id' => $item['media_id'],
                    'type' => $item['type'],
                    'sort_order' => $item['sort_order'] ?? 0,
                ]);
                $keepIds[] = $existing->id;
            } else {
                $created = $exhibition->media()->create([
                    'media_id' => $item['media_id'],
                    'type' => $item['type'],
                    'sort_order' => $item['sort_order'] ?? 0,
                ]);
                $keepIds[] = $created->id;
            }
        }

        $exhibition->media()->whereNotIn('id', $keepIds)->delete();
    }
}
