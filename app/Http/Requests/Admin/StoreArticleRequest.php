<?php

namespace App\Http\Requests\Admin;

use App\Enums\ArticleStatus;
use App\Enums\ArticleType;
use App\Enums\Locale;
use App\Http\Requests\Admin\Concerns\ValidatesArticlePayload;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreArticleRequest extends FormRequest
{
    use ValidatesArticlePayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(ArticleType::class)],
            'status' => ['required', Rule::enum(ArticleStatus::class)],
            'published_at' => ['nullable', 'date'],
            'is_active' => ['required', 'boolean'],

            'translations' => ['required', 'array', 'min:1'],
            'translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'translations.*.slug' => ['required', 'string', 'max:255'],
            'translations.*.title' => ['required', 'string', 'max:255'],
            'translations.*.short_text' => ['required', 'string'],
            'translations.*.content' => ['required', 'string'],

            'media' => ['sometimes', 'array'],
            'media.*.media_id' => ['required', 'integer', Rule::exists('media', 'id')->whereNull('deleted_at')],
            'media.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectDuplicateTranslationLocales($validator);
            $this->rejectDuplicateSlugPerLocaleWithinRequest($validator);
            $this->rejectSlugCollisionsWithOtherArticles($validator);
            $this->rejectDuplicateMediaIds($validator);
            $this->rejectUnsafeRichText($validator);
        });
    }
}
