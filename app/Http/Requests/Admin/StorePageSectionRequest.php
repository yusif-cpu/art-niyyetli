<?php

namespace App\Http\Requests\Admin;

use App\Enums\Locale;
use App\Http\Requests\Admin\Concerns\ValidatesPageSectionPayload;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePageSectionRequest extends FormRequest
{
    use ValidatesPageSectionPayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return [
            'key' => ['required', 'string', 'max:255'],
            'media_id' => ['nullable', 'integer', Rule::exists('media', 'id')->whereNull('deleted_at')],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],

            'translations' => ['required', 'array', 'min:1'],
            'translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'translations.*.heading' => ['required', 'string', 'max:255'],
            'translations.*.body' => ['required', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectDuplicateTranslationLocales($validator);
            $this->rejectDuplicateKeyWithinPage($validator, (int) $this->route('page')->id);
            $this->rejectUnsafeRichText($validator);
        });
    }
}
