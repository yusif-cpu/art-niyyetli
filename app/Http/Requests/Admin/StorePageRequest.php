<?php

namespace App\Http\Requests\Admin;

use App\Enums\Locale;
use App\Enums\PageType;
use App\Http\Requests\Admin\Concerns\ValidatesPagePayload;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePageRequest extends FormRequest
{
    use ValidatesPagePayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return [
            'type' => [
                'required',
                Rule::enum(PageType::class),
                Rule::when(
                    $this->input('type') !== PageType::Custom->value,
                    [Rule::unique('pages', 'type')]
                ),
            ],
            'is_active' => ['required', 'boolean'],

            'translations' => ['required', 'array', 'min:1'],
            'translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'translations.*.slug' => ['required', 'string', 'max:255'],
            'translations.*.title' => ['required', 'string', 'max:255'],
            'translations.*.content' => ['required', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectDuplicateTranslationLocales($validator);
            $this->rejectDuplicateSlugPerLocaleWithinRequest($validator);
            $this->rejectSlugCollisionsWithOtherPages($validator);
            $this->rejectUnsafeRichText($validator);
        });
    }
}
