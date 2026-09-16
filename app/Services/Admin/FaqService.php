<?php

namespace App\Services\Admin;

use App\Models\Faq;
use Illuminate\Support\Facades\DB;

class FaqService
{
    public function create(array $data): Faq
    {
        $translations = $data['translations'];
        unset($data['translations']);

        if (! isset($data['sort_order'])) {
            $data['sort_order'] = ((int) Faq::where('page_id', $data['page_id'])->max('sort_order')) + 1;
        }

        return DB::transaction(function () use ($data, $translations) {
            $faq = Faq::create($data);

            $this->syncTranslations($faq, $translations);

            return $faq->fresh();
        });
    }

    public function update(Faq $faq, array $data): Faq
    {
        $translations = $data['translations'] ?? null;
        unset($data['translations']);

        return DB::transaction(function () use ($faq, $data, $translations) {
            $faq->update($data);

            if ($translations !== null) {
                $this->syncTranslations($faq, $translations);
            }

            return $faq->fresh();
        });
    }

    public function delete(Faq $faq): void
    {
        $faq->delete();
    }

    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items) {
            foreach ($items as $item) {
                Faq::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
            }
        });
    }

    private function syncTranslations(Faq $faq, array $translations): void
    {
        foreach ($translations as $translation) {
            $faq->translations()->updateOrCreate(
                ['locale' => $translation['locale']],
                [
                    'question' => $translation['question'],
                    'answer' => $translation['answer'],
                ]
            );
        }
    }
}
