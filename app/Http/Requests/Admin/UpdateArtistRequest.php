<?php

namespace App\Http\Requests\Admin;

use App\Enums\Locale;
use App\Http\Requests\Admin\Concerns\ValidatesArtistPayload;
use App\Rules\Slug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateArtistRequest extends FormRequest
{
    use ValidatesArtistPayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        $currentYear = (int) date('Y');

        return [
            'representation_image_id' => ['sometimes', 'nullable', 'integer', Rule::exists('media', 'id')->whereNull('deleted_at')],
            'birth_year' => ['sometimes', 'nullable', 'integer', 'min:1000', 'max:'.$currentYear],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],

            'translations' => ['sometimes', 'array', 'min:1'],
            'translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'translations.*.slug' => ['required', 'string', new Slug($this->route('artist'))],
            'translations.*.first_name' => ['required', 'string', 'max:255'],
            'translations.*.last_name' => ['required', 'string', 'max:255'],
            'translations.*.birth_place' => ['nullable', 'string', 'max:255'],
            'translations.*.direction' => ['nullable', 'string', 'max:255'],
            'translations.*.biography' => ['nullable', 'string'],
            'translations.*.artistic_approach' => ['nullable', 'string'],

            'exhibitions' => ['sometimes', 'array'],
            'exhibitions.*.year' => ['required', 'integer', 'min:1000', 'max:'.$currentYear],
            'exhibitions.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'exhibitions.*.translations' => ['required', 'array', 'min:1'],
            'exhibitions.*.translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'exhibitions.*.translations.*.title' => ['required', 'string', 'max:255'],
            'exhibitions.*.translations.*.venue' => ['required', 'string', 'max:255'],

            'awards' => ['sometimes', 'array'],
            'awards.*.year' => ['required', 'integer', 'min:1000', 'max:'.$currentYear],
            'awards.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'awards.*.translations' => ['required', 'array', 'min:1'],
            'awards.*.translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'awards.*.translations.*.title' => ['required', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectDuplicateTranslationLocales($validator);
            if ($this->has('translations')) {
                $this->requireAzTranslation($validator);
            }
            $this->rejectSlugCollisionsWithOtherArtists($validator);
        });
    }
}
