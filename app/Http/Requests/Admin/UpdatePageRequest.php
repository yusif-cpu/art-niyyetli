<?php

namespace App\Http\Requests\Admin;

use App\Enums\Locale;
use App\Enums\PageType;
use App\Http\Requests\Admin\Concerns\ValidatesPagePayload;
use App\Http\Requests\Admin\Concerns\ValidatesSeoPayload;
use App\Rules\Slug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdatePageRequest extends FormRequest
{
    use ValidatesPagePayload;
    use ValidatesSeoPayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        $pageId = $this->route('page')?->id;

        return [
            'type' => [
                'sometimes',
                Rule::enum(PageType::class),
                Rule::when(
                    $this->input('type') !== PageType::Custom->value,
                    [Rule::unique('pages', 'type')->ignore($pageId)]
                ),
            ],
            'is_active' => ['sometimes', 'boolean'],

            'translations' => ['sometimes', 'array', 'min:1'],
            'translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'translations.*.slug' => ['required', 'string', new Slug($this->route('page'), topLevel: true)],
            'translations.*.title' => ['required', 'string', 'max:255'],
            'translations.*.content' => ['required', 'string'],

            ...$this->seoRules(),
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectDuplicateSeoLocales($validator);
            $this->rejectDuplicateTranslationLocales($validator);
            $this->rejectDuplicateSlugPerLocaleWithinRequest($validator);
            $this->rejectSlugCollisionsWithOtherPages($validator);
            $this->rejectUnsafeRichText($validator);
        });
    }
}
