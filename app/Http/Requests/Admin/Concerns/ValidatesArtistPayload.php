<?php

namespace App\Http\Requests\Admin\Concerns;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Illuminate\Validation\Validator;

trait ValidatesArtistPayload
{
    protected function rejectDuplicateTranslationLocales(Validator $validator): void
    {
        $locales = collect($this->input('translations', []))->pluck('locale');

        if ($locales->count() !== $locales->unique()->count()) {
            $validator->errors()->add('translations', 'Each locale may only appear once.');
        }
    }

    /**
     * The AZ translation is the canonical one every other locale falls back to, so an artist saved without it
     * would have no usable public slug. Its slug, first and last name are already required per translation.
     * An update may send only the EN translation as long as the artist already has a stored AZ one.
     */
    protected function requireAzTranslation(Validator $validator): void
    {
        $locales = collect($this->input('translations', []))->pluck('locale');

        $hasStoredAz = $this->route('artist')?->translations()->where('locale', 'az')->exists() ?? false;

        if (! $locales->contains('az') && ! $hasStoredAz) {
            $validator->errors()->add('translations', 'An Azerbaijani (az) translation with a slug is required.');
        }
    }

    protected function rejectSlugCollisionsWithOtherArtists(Validator $validator): void
    {
        $currentArtist = $this->route('artist');
        $currentArtistId = $currentArtist?->id;

        foreach ($this->input('translations', []) as $index => $translation) {
            if (empty($translation['slug']) || empty($translation['locale'])) {
                continue;
            }

            $exists = Rule::unique('artist_translations', 'slug')
                ->where(fn ($query) => $query->where('locale', $translation['locale']))
                ->when($currentArtistId, fn ($rule) => $rule->ignore($currentArtistId, 'artist_id'));

            $failed = ! $this->passesUniqueRule($exists, $translation['slug']);

            if ($failed) {
                $validator->errors()->add(
                    "translations.{$index}.slug",
                    'This slug is already in use for the given locale.'
                );
            }
        }
    }

    private function passesUniqueRule(Unique $rule, string $value): bool
    {
        $validator = validator(['slug' => $value], ['slug' => [$rule]]);

        return $validator->passes();
    }
}
