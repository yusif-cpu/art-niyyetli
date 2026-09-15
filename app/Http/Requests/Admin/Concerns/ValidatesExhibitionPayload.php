<?php

namespace App\Http\Requests\Admin\Concerns;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Illuminate\Validation\Validator;

trait ValidatesExhibitionPayload
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

    protected function rejectSlugCollisionsWithOtherExhibitions(Validator $validator): void
    {
        $currentExhibition = $this->route('exhibition');
        $currentExhibitionId = $currentExhibition?->id;

        foreach ($this->input('translations', []) as $index => $translation) {
            if (empty($translation['slug']) || empty($translation['locale'])) {
                continue;
            }

            $exists = Rule::unique('exhibition_translations', 'slug')
                ->where(fn ($query) => $query->where('locale', $translation['locale']))
                ->when($currentExhibitionId, fn ($rule) => $rule->ignore($currentExhibitionId, 'exhibition_id'));

            $failed = ! $this->passesUniqueRule($exists, $translation['slug']);

            if ($failed) {
                $validator->errors()->add(
                    "translations.{$index}.slug",
                    'This slug is already in use for the given locale.'
                );
            }
        }
    }

    protected function rejectDuplicateArtistIds(Validator $validator): void
    {
        $ids = collect($this->input('artists', []))->pluck('artist_id');

        if ($ids->count() !== $ids->unique()->count()) {
            $validator->errors()->add('artists', 'Duplicate artist_id in the artists list.');
        }
    }

    protected function rejectDuplicateArtworkIds(Validator $validator): void
    {
        $ids = collect($this->input('artworks', []))->pluck('artwork_id');

        if ($ids->count() !== $ids->unique()->count()) {
            $validator->errors()->add('artworks', 'Duplicate artwork_id in the artworks list.');
        }
    }

    protected function rejectDuplicateMediaEntries(Validator $validator): void
    {
        $entries = collect($this->input('media', []));

        $ids = $entries->pluck('id')->filter(fn ($id) => $id !== null && $id !== '');

        if ($ids->count() !== $ids->unique()->count()) {
            $validator->errors()->add('media', 'Duplicate media entry id in the media list.');
        }

        $mediaIds = $entries->pluck('media_id')->filter(fn ($id) => $id !== null && $id !== '');

        if ($mediaIds->count() !== $mediaIds->unique()->count()) {
            $validator->errors()->add('media', 'Duplicate media_id in the media list.');
        }
    }

    protected function rejectEndDateBeforeStartDate(Validator $validator): void
    {
        $startDate = $this->input('start_date');
        $endDate = $this->input('end_date');

        if ($startDate === null && $endDate === null) {
            return;
        }

        $exhibition = $this->route('exhibition');

        if ($startDate === null) {
            $startDate = $exhibition?->start_date?->toDateString();
        }

        if ($endDate === null) {
            $endDate = $exhibition?->end_date?->toDateString();
        }

        if ($startDate === null || $endDate === null) {
            return;
        }

        if (strtotime($endDate) < strtotime($startDate)) {
            $validator->errors()->add('end_date', 'The end date must be on or after the start date.');
        }
    }

    private function passesUniqueRule(Unique $rule, string $value): bool
    {
        $validator = validator(['slug' => $value], ['slug' => [$rule]]);

        return $validator->passes();
    }
}
