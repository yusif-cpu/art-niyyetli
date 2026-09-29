<?php

namespace App\Services\Admin;

use App\Enums\ArticleStatus;
use App\Exceptions\ArticleDeletionNotAllowedException;
use App\Models\Article;
use Illuminate\Support\Facades\DB;

class ArticleService
{
    public function __construct(private SeoMetadataService $seo) {}

    public function create(array $data): Article
    {
        $translations = $data['translations'];
        $media = $data['media'] ?? [];
        $seo = $data['seo'] ?? null;
        unset($data['translations'], $data['media'], $data['youtube_url'], $data['seo']);

        return DB::transaction(function () use ($data, $translations, $media, $seo) {
            $article = Article::create($data);

            $this->syncTranslations($article, $translations);
            $this->syncMedia($article, $media);

            if ($seo !== null) {
                $this->seo->sync($article, $seo);
            }

            return $article->fresh();
        });
    }

    public function update(Article $article, array $data): Article
    {
        $translations = $data['translations'] ?? null;
        $media = array_key_exists('media', $data) ? $data['media'] : null;
        $seo = $data['seo'] ?? null;
        unset($data['translations'], $data['media'], $data['youtube_url'], $data['seo']);

        return DB::transaction(function () use ($article, $data, $translations, $media, $seo) {
            $article->update($data);

            if ($translations !== null) {
                $this->syncTranslations($article, $translations);
            }

            if ($media !== null) {
                $this->syncMedia($article, $media);
            }

            if ($seo !== null) {
                $this->seo->sync($article, $seo);
            }

            return $article->fresh();
        });
    }

    public function delete(Article $article): void
    {
        if ($article->status === ArticleStatus::Published) {
            throw new ArticleDeletionNotAllowedException('Published articles carry historical/SEO value and cannot be deleted; deactivate it or set its status back to draft instead.');
        }

        $article->delete();
    }

    /**
     * Mirrors SeoMetadataService::sync: a locale entirely absent from the payload is left untouched (a partial
     * update that does not mention it at all), but a locale that IS present with every field blank means the
     * editor cleared it — articles may be AZ-only, so that locale's row is deleted rather than upserted blank.
     */
    private function syncTranslations(Article $article, array $translations): void
    {
        foreach ($translations as $translation) {
            $values = [
                'slug' => $translation['slug'] ?? null,
                'title' => $translation['title'] ?? null,
                'short_text' => $translation['short_text'] ?? null,
                'content' => $translation['content'] ?? null,
            ];

            $rows = $article->translations()->where('locale', $translation['locale']);

            if (! array_filter($values, fn ($value) => $value !== null && $value !== '')) {
                $rows->delete();

                continue;
            }

            $article->translations()->updateOrCreate(['locale' => $translation['locale']], $values);
        }
    }

    private function syncMedia(Article $article, array $media): void
    {
        $map = collect($media)->mapWithKeys(fn ($item) => [
            $item['media_id'] => ['sort_order' => $item['sort_order'] ?? 0],
        ])->all();

        $article->media()->sync($map);
    }
}
