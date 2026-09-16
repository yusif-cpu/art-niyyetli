<?php

namespace App\Http\Requests\Admin\Concerns;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Illuminate\Validation\Validator;

trait ValidatesPagePayload
{
    protected function rejectDuplicateTranslationLocales(Validator $validator): void
    {
        $locales = collect($this->input('translations', []))->pluck('locale');

        if ($locales->count() !== $locales->unique()->count()) {
            $validator->errors()->add('translations', 'Each locale may only appear once.');
        }
    }

    protected function rejectDuplicateSlugPerLocaleWithinRequest(Validator $validator): void
    {
        $pairs = collect($this->input('translations', []))
            ->map(fn ($t) => ($t['locale'] ?? '').'|'.($t['slug'] ?? ''));

        if ($pairs->count() !== $pairs->unique()->count()) {
            $validator->errors()->add('translations', 'Duplicate slug within the same locale.');
        }
    }

    protected function rejectSlugCollisionsWithOtherPages(Validator $validator): void
    {
        $currentPage = $this->route('page');
        $currentPageId = $currentPage?->id;

        foreach ($this->input('translations', []) as $index => $translation) {
            if (empty($translation['slug']) || empty($translation['locale'])) {
                continue;
            }

            $exists = Rule::unique('page_translations', 'slug')
                ->where(fn ($query) => $query->where('locale', $translation['locale']))
                ->when($currentPageId, fn ($rule) => $rule->ignore($currentPageId, 'page_id'));

            $failed = ! $this->passesUniqueRule($exists, $translation['slug']);

            if ($failed) {
                $validator->errors()->add(
                    "translations.{$index}.slug",
                    'This slug is already in use for the given locale.'
                );
            }
        }
    }

    protected function rejectUnsafeRichText(Validator $validator): void
    {
        $patterns = ['/<script/i', '/<iframe/i', '/javascript:/i', '/on\w+\s*=/i'];

        foreach ($this->input('translations', []) as $index => $translation) {
            $value = $translation['content'] ?? null;

            if (! is_string($value)) {
                continue;
            }

            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $value) === 1) {
                    $validator->errors()->add(
                        "translations.{$index}.content",
                        'This field contains disallowed content (scripts, iframes, or event-handler attributes are not permitted).'
                    );

                    break;
                }
            }
        }
    }

    private function passesUniqueRule(Unique $rule, string $value): bool
    {
        $validator = validator(['slug' => $value], ['slug' => [$rule]]);

        return $validator->passes();
    }
}
