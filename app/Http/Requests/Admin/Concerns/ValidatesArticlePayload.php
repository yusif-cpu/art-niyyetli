<?php

namespace App\Http\Requests\Admin\Concerns;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Illuminate\Validation\Validator;

trait ValidatesArticlePayload
{
    /** Fields a translation entry has; only `az` is truly mandatory, and it may never be blanked out. */
    private const TRANSLATION_FIELDS = ['slug', 'title', 'short_text', 'content'];

    /**
     * An empty string for any translation field is normalized to null before validation runs, so `nullable` (and,
     * for slug, the Slug rule's own format check) actually treats it as absent — matching how the analogous SEO
     * fields already behave, and how ArticleService::syncTranslations tells "left blank on purpose" from "not sent".
     */
    protected function blankTranslationFieldsToNull(): void
    {
        $translations = $this->input('translations');

        if (! is_array($translations)) {
            return;
        }

        foreach ($translations as $index => $translation) {
            foreach (self::TRANSLATION_FIELDS as $field) {
                if (($translation[$field] ?? null) === '') {
                    $translations[$index][$field] = null;
                }
            }
        }

        $this->merge(['translations' => $translations]);
    }

    /**
     * Articles may be AZ-only: a non-`az` locale entry may be either fully filled or fully blank (a deliberate
     * "clear this locale" — see ArticleService::syncTranslations), but `az` itself must always be fully filled,
     * and a locale that mixes filled and blank fields is neither of those and is rejected field by field.
     */
    protected function rejectIncompleteTranslations(Validator $validator): void
    {
        foreach ($this->input('translations', []) as $index => $translation) {
            $filledCount = collect(self::TRANSLATION_FIELDS)->filter(fn ($field) => filled($translation[$field] ?? null))->count();

            if ($filledCount === count(self::TRANSLATION_FIELDS)) {
                continue;
            }

            if ($filledCount === 0 && ($translation['locale'] ?? null) !== 'az') {
                continue;
            }

            foreach (self::TRANSLATION_FIELDS as $field) {
                if (! filled($translation[$field] ?? null)) {
                    $validator->errors()->add("translations.{$index}.{$field}", 'This field is required.');
                }
            }
        }
    }

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

    protected function rejectSlugCollisionsWithOtherArticles(Validator $validator): void
    {
        $currentArticle = $this->route('article');
        $currentArticleId = $currentArticle?->id;

        foreach ($this->input('translations', []) as $index => $translation) {
            if (empty($translation['slug']) || empty($translation['locale'])) {
                continue;
            }

            $exists = Rule::unique('article_translations', 'slug')
                ->where(fn ($query) => $query->where('locale', $translation['locale']))
                ->when($currentArticleId, fn ($rule) => $rule->ignore($currentArticleId, 'article_id'));

            $failed = ! $this->passesUniqueRule($exists, $translation['slug']);

            if ($failed) {
                $validator->errors()->add(
                    "translations.{$index}.slug",
                    'This slug is already in use for the given locale.'
                );
            }
        }
    }

    protected function rejectDuplicateMediaIds(Validator $validator): void
    {
        $ids = collect($this->input('media', []))->pluck('media_id')->filter(fn ($id) => $id !== null && $id !== '');

        if ($ids->count() !== $ids->unique()->count()) {
            $validator->errors()->add('media', 'Duplicate media_id in the media list.');
        }
    }

    protected function rejectUnsafeRichText(Validator $validator): void
    {
        $patterns = ['/<script/i', '/<iframe/i', '/javascript:/i', '/on\w+\s*=/i'];

        foreach ($this->input('translations', []) as $index => $translation) {
            foreach (['short_text', 'content'] as $field) {
                $value = $translation[$field] ?? null;

                if (! is_string($value)) {
                    continue;
                }

                foreach ($patterns as $pattern) {
                    if (preg_match($pattern, $value) === 1) {
                        $validator->errors()->add(
                            "translations.{$index}.{$field}",
                            'This field contains disallowed content (scripts, iframes, or event-handler attributes are not permitted).'
                        );

                        break;
                    }
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
