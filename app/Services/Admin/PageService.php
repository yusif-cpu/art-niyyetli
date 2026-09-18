<?php

namespace App\Services\Admin;

use App\Enums\PageNavPlacement;
use App\Enums\PageType;
use App\Exceptions\PageDeletionNotAllowedException;
use App\Models\Page;
use App\Models\PageSection;
use Illuminate\Support\Facades\DB;

class PageService
{
    public function create(array $data): Page
    {
        $translations = $data['translations'];
        unset($data['translations']);

        return DB::transaction(function () use ($data, $translations) {
            $data['sort_order'] = $this->nextSortOrder($data['nav_placement'] ?? PageNavPlacement::None->value);

            $page = Page::create($data);

            $this->syncTranslations($page, $translations);

            return $page->fresh();
        });
    }

    public function update(Page $page, array $data): Page
    {
        $translations = $data['translations'] ?? null;
        unset($data['translations']);

        return DB::transaction(function () use ($page, $data, $translations) {
            if (isset($data['nav_placement']) && $data['nav_placement'] !== $page->nav_placement->value) {
                $data['sort_order'] = $this->nextSortOrder($data['nav_placement']);
            }

            $page->update($data);

            if ($translations !== null) {
                $this->syncTranslations($page, $translations);
            }

            return $page->fresh();
        });
    }

    public function delete(Page $page): void
    {
        if ($page->type !== PageType::Custom) {
            throw new PageDeletionNotAllowedException('Structural pages (home, about, collectors, contact) cannot be deleted; deactivate or unlist it instead.');
        }

        $page->delete();
    }

    private function nextSortOrder(string $navPlacement): int
    {
        return ((int) Page::where('nav_placement', $navPlacement)->max('sort_order')) + 1;
    }

    public function createSection(Page $page, array $data): PageSection
    {
        $translations = $data['translations'];
        unset($data['translations']);

        if (! isset($data['sort_order'])) {
            $data['sort_order'] = ((int) $page->sections()->max('sort_order')) + 1;
        }

        $data['page_id'] = $page->id;

        return DB::transaction(function () use ($data, $translations) {
            $section = PageSection::create($data);

            $this->syncSectionTranslations($section, $translations);

            return $section->fresh();
        });
    }

    public function updateSection(PageSection $section, array $data): PageSection
    {
        $translations = $data['translations'] ?? null;
        unset($data['translations']);

        return DB::transaction(function () use ($section, $data, $translations) {
            $section->update($data);

            if ($translations !== null) {
                $this->syncSectionTranslations($section, $translations);
            }

            return $section->fresh();
        });
    }

    public function reorderSections(Page $page, array $items): void
    {
        DB::transaction(function () use ($page, $items) {
            foreach ($items as $item) {
                $page->sections()->where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
            }
        });
    }

    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items) {
            foreach ($items as $item) {
                Page::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
            }
        });
    }

    private function syncTranslations(Page $page, array $translations): void
    {
        foreach ($translations as $translation) {
            $page->translations()->updateOrCreate(
                ['locale' => $translation['locale']],
                [
                    'slug' => $translation['slug'],
                    'title' => $translation['title'],
                    'content' => $translation['content'],
                ]
            );
        }
    }

    private function syncSectionTranslations(PageSection $section, array $translations): void
    {
        foreach ($translations as $translation) {
            $section->translations()->updateOrCreate(
                ['locale' => $translation['locale']],
                [
                    'heading' => $translation['heading'],
                    'body' => $translation['body'],
                ]
            );
        }
    }
}
