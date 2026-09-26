<?php

namespace App\Http\Requests\Admin\Concerns;

use App\Enums\Locale;
use App\Rules\Slug;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Shared payload rules for the genre and medium catalogue terms: a slug, sort order and active flag on the term
 * itself, plus a localized name per translation (AZ is required as the canonical fallback).
 */
trait ValidatesCatalogTermPayload
{
    /**
     * @param  string  $table  `genres` or `mediums`
     * @param  bool  $partial  true for updates, where every top-level field is optional
     */
    protected function catalogTermRules(string $table, bool $partial, ?int $ignoreId = null): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'slug' => [$required, 'string', new Slug, Rule::unique($table, 'slug')->ignore($ignoreId)],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => [$partial ? 'sometimes' : 'required', 'boolean'],

            'translations' => [$required, 'array', 'min:1'],
            'translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'translations.*.name' => ['required', 'string', 'max:255'],
        ];
    }

    protected function validateCatalogTermTranslations(Validator $validator, ?object $current): void
    {
        $validator->after(function (Validator $validator) use ($current): void {
            if (! $this->has('translations')) {
                return;
            }

            $locales = collect($this->input('translations', []))->pluck('locale');

            if ($locales->count() !== $locales->unique()->count()) {
                $validator->errors()->add('translations', 'Each locale may only appear once.');
            }

            $hasStoredAz = $current?->translations()->where('locale', 'az')->exists() ?? false;

            if (! $locales->contains('az') && ! $hasStoredAz) {
                $validator->errors()->add('translations', 'An Azerbaijani (az) translation is required.');
            }
        });
    }
}
