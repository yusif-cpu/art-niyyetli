<?php

namespace App\Services\Admin;

use App\Enums\ArticleStatus;
use App\Exceptions\ArticleDeletionNotAllowedException;
use App\Models\Article;
use Illuminate\Support\Facades\DB;

class ArticleService
{
    public function create(array $data): Article
    {
        $translations = $data['translations'];
        $media = $data['media'] ?? [];
        unset($data['translations'], $data['media']);

        return DB::transaction(function () use ($data, $translations, $media) {
            $article = Article::create($data);

            $this->syncTranslations($article, $translations);
            $this->syncMedia($article, $media);

            return $article->fresh();
        });
    }

    public function update(Article $article, array $data): Article
    {
        $translations = $data['translations'] ?? null;
        $media = array_key_exists('media', $data) ? $data['media'] : null;
        unset($data['translations'], $data['media']);

        return DB::transaction(function () use ($article, $data, $translations, $media) {
            $article->update($data);

            if ($translations !== null) {
                $this->syncTranslations($article, $translations);
            }

            if ($media !== null) {
                $this->syncMedia($article, $media);
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

    private function syncTranslations(Article $article, array $translations): void
    {
        foreach ($translations as $translation) {
            $article->translations()->updateOrCreate(
                ['locale' => $translation['locale']],
                [
                    'slug' => $translation['slug'],
                    'title' => $translation['title'],
                    'short_text' => $translation['short_text'],
                    'content' => $translation['content'],
                ]
            );
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
