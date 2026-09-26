<?php

namespace App\Http\Requests\Admin;

use App\Enums\ExhibitionMediaType;
use App\Enums\ExhibitionStatus;
use App\Enums\ExhibitionType;
use App\Enums\Locale;
use App\Http\Requests\Admin\Concerns\ValidatesExhibitionPayload;
use App\Http\Requests\Admin\Concerns\ValidatesSeoPayload;
use App\Http\Requests\Admin\Concerns\ValidatesYoutubeVideoPayload;
use App\Rules\Slug;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreExhibitionRequest extends FormRequest
{
    use ValidatesExhibitionPayload;
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
            'type' => ['required', Rule::enum(ExhibitionType::class)],
            'status' => ['required', Rule::enum(ExhibitionStatus::class)],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'is_active' => ['required', 'boolean'],

            'translations' => ['required', 'array', 'min:1'],
            'translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'translations.*.slug' => ['required', 'string', new Slug],
            'translations.*.title' => ['required', 'string', 'max:255'],
            'translations.*.venue' => ['required', 'string', 'max:255'],
            'translations.*.short_text' => ['required', 'string'],
            'translations.*.full_text' => ['required', 'string'],

            'artists' => ['sometimes', 'array'],
            'artists.*.artist_id' => ['required', 'integer', Rule::exists('artists', 'id')->whereNull('deleted_at')],
            'artists.*.sort_order' => ['nullable', 'integer', 'min:0'],

            'artworks' => ['sometimes', 'array'],
            'artworks.*.artwork_id' => ['required', 'integer', Rule::exists('artworks', 'id')->whereNull('deleted_at')],
            'artworks.*.sort_order' => ['nullable', 'integer', 'min:0'],

            'media' => ['sometimes', 'array'],
            'media.*.media_id' => ['required', 'integer', Rule::exists('media', 'id')->whereNull('deleted_at')],
            'media.*.type' => ['required', Rule::enum(ExhibitionMediaType::class)],
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
            $this->rejectSlugCollisionsWithOtherExhibitions($validator);
            $this->rejectDuplicateArtistIds($validator);
            $this->rejectDuplicateArtworkIds($validator);
            $this->rejectDuplicateMediaEntries($validator);
            $this->rejectEndDateBeforeStartDate($validator);
            $this->rejectInvalidYoutubeUrl($validator);
        });
    }
}
