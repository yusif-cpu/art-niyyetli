<?php

namespace App\Http\Requests\Admin;

use App\Enums\Locale;
use App\Http\Requests\Admin\Concerns\ValidatesFaqPayload;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateFaqRequest extends FormRequest
{
    use ValidatesFaqPayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return [
            'page_id' => ['sometimes', 'integer', Rule::exists('pages', 'id')],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],

            'translations' => ['sometimes', 'array', 'min:1'],
            'translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'translations.*.question' => ['required', 'string', 'max:255'],
            'translations.*.answer' => ['required', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectDuplicateTranslationLocales($validator);
            $this->rejectUnsafeRichText($validator);
        });
    }
}
