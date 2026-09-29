<?php

namespace App\Http\Requests\Admin\Concerns;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Illuminate\Validation\Validator;

trait ValidatesArtworkPayload
{
    protected function rejectDuplicateTranslationLocales(Validator $validator): void
    {
        $locales = collect($this->input('translations', []))->pluck('locale');

        if ($locales->count() !== $locales->unique()->count()) {
            $validator->errors()->add('translations', trans('validation.custom_messages.duplicate_locale'));
        }
    }

    protected function rejectDuplicateSlugPerLocaleWithinRequest(Validator $validator): void
    {
        $pairs = collect($this->input('translations', []))
            ->map(fn ($t) => ($t['locale'] ?? '').'|'.($t['slug'] ?? ''));

        if ($pairs->count() !== $pairs->unique()->count()) {
            $validator->errors()->add('translations', trans('validation.custom_messages.duplicate_slug_within_locale'));
        }
    }

    protected function rejectSlugCollisionsWithOtherArtworks(Validator $validator): void
    {
        $currentArtwork = $this->route('artwork');
        $currentArtworkId = $currentArtwork?->id;

        foreach ($this->input('translations', []) as $index => $translation) {
            if (empty($translation['slug']) || empty($translation['locale'])) {
                continue;
            }

            $exists = Rule::unique('artwork_translations', 'slug')
                ->where(fn ($query) => $query->where('locale', $translation['locale']))
                ->when($currentArtworkId, fn ($rule) => $rule->ignore($currentArtworkId, 'artwork_id'));

            $failed = ! $this->passesUniqueRule($exists, $translation['slug']);

            if ($failed) {
                $validator->errors()->add(
                    "translations.{$index}.slug",
                    trans('validation.custom_messages.slug_already_used_for_locale')
                );
            }
        }
    }

    protected function rejectMultipleMainImages(Validator $validator): void
    {
        $mainCount = collect($this->input('images', []))->filter(fn ($i) => (bool) ($i['is_main'] ?? false))->count();

        if ($mainCount > 1) {
            $validator->errors()->add('images', trans('validation.custom_messages.only_one_main_image'));
        }
    }

    private function passesUniqueRule(Unique $rule, string $value): bool
    {
        $validator = validator(['slug' => $value], ['slug' => [$rule]]);

        return $validator->passes();
    }
}
