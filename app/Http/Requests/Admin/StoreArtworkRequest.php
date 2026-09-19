<?php

namespace App\Http\Requests\Admin;

use App\Enums\ArtworkAvailability;
use App\Enums\ArtworkImageType;
use App\Enums\Locale;
use App\Http\Requests\Admin\Concerns\ValidatesArtworkPayload;
use App\Http\Requests\Admin\Concerns\ValidatesYoutubeVideoPayload;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreArtworkRequest extends FormRequest
{
    use ValidatesArtworkPayload;
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
        $currentYear = (int) date('Y');

        return [
            'artist_id' => ['required', 'integer', Rule::exists('artists', 'id')->whereNull('deleted_at')],
            'medium_id' => ['required', 'integer', Rule::exists('mediums', 'id')->where('is_active', true)],
            'genre_id' => ['required', 'integer', Rule::exists('genres', 'id')->where('is_active', true)],
            'year_created' => ['required', 'integer', 'min:1000', 'max:'.$currentYear],
            'width_cm' => ['required', 'numeric', 'gt:0', 'max:999999.99'],
            'height_cm' => ['required', 'numeric', 'gt:0', 'max:999999.99'],
            'price' => ['required', 'numeric', 'min:0', 'decimal:0,2'],
            'show_price' => ['required', 'boolean'],
            'availability' => ['required', Rule::enum(ArtworkAvailability::class)],
            'year_sold' => [
                'nullable', 'integer', 'min:1000', 'max:'.$currentYear,
                Rule::prohibitedIf(fn () => $this->input('availability') !== ArtworkAvailability::Sold->value),
            ],
            'inventory_code' => ['nullable', 'string', 'max:50', Rule::unique('artworks', 'inventory_code')],
            'certificate' => ['required', 'boolean'],
            'frame_condition' => ['nullable', 'string'],
            'delivery_note' => ['nullable', 'string'],
            'featured' => ['required', 'boolean'],
            'show_on_wall' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],

            'translations' => ['required', 'array', 'min:1'],
            'translations.*.locale' => ['required', Rule::enum(Locale::class)],
            'translations.*.slug' => ['required', 'string', 'max:255'],
            'translations.*.title' => ['required', 'string', 'max:255'],
            'translations.*.short_description' => ['required', 'string'],
            'translations.*.provenance' => ['required', 'string'],

            'images' => ['sometimes', 'array'],
            'images.*.media_id' => ['required', 'integer', Rule::exists('media', 'id')->whereNull('deleted_at')],
            'images.*.type' => ['required', Rule::enum(ArtworkImageType::class)],
            'images.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'images.*.is_main' => ['nullable', 'boolean'],

            'youtube_url' => ['nullable', 'string', 'max:500'],
            'youtube_video_id' => ['sometimes', 'nullable', 'string', 'regex:/^[A-Za-z0-9_-]{11}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'width_cm.max' => 'En ölçüsü 999999.99 sm-dən çox ola bilməz.',
            'height_cm.max' => 'Hündürlük ölçüsü 999999.99 sm-dən çox ola bilməz.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectDuplicateTranslationLocales($validator);
            $this->rejectDuplicateSlugPerLocaleWithinRequest($validator);
            $this->rejectSlugCollisionsWithOtherArtworks($validator);
            $this->rejectMultipleMainImages($validator);
            $this->rejectInvalidYoutubeUrl($validator);
        });
    }
}
