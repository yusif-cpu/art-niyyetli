<?php

namespace App\Http\Requests\Admin;

use App\Enums\ArticleStatus;
use App\Enums\ArticleType;
use App\Enums\Locale;
use App\Http\Requests\Admin\Concerns\ValidatesArticlePayload;
use App\Http\Requests\Admin\Concerns\ValidatesSeoPayload;
use App\Http\Requests\Admin\Concerns\ValidatesYoutubeVideoPayload;
use App\Rules\Slug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateArticleRequest extends FormRequest
{
    use ValidatesArticlePayload;
    use ValidatesSeoPayload;
    use ValidatesYoutubeVideoPayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    protected function prepareForValidation(): void
    {
        $this->deriveYoutubeVideoId();
    }

    public function rules(): array
    {
        return [
            'type' => ['sometimes', Rule::enum(ArticleType::class)],
            'status' => ['sometimes', Rule::enum(ArticleStatus::class)],
            'published_at' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],

            'translations' => ['sometimes', 'array', 'min:1'],
            'translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'translations.*.slug' => ['required', 'string', new Slug($this->route('article'))],
            'translations.*.title' => ['required', 'string', 'max:255'],
            'translations.*.short_text' => ['required', 'string'],
            'translations.*.content' => ['required', 'string'],

            'media' => ['sometimes', 'array'],
            'media.*.media_id' => ['required', 'integer', Rule::exists('media', 'id')->whereNull('deleted_at')],
            'media.*.sort_order' => ['nullable', 'integer', 'min:0'],

            'youtube_url' => ['nullable', 'string', 'max:500'],
            'youtube_video_id' => ['sometimes', 'nullable', 'string', 'regex:/^[A-Za-z0-9_-]{11}$/'],

            ...$this->seoRules(),
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectDuplicateSeoLocales($validator);
            $this->rejectDuplicateTranslationLocales($validator);
            $this->rejectDuplicateSlugPerLocaleWithinRequest($validator);
            $this->rejectSlugCollisionsWithOtherArticles($validator);
            $this->rejectDuplicateMediaIds($validator);
            $this->rejectUnsafeRichText($validator);
            $this->rejectInvalidYoutubeUrl($validator);
        });
    }
}
