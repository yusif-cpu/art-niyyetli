<?php

namespace App\Http\Requests\Admin\Concerns;

use App\Enums\Locale;
use App\Enums\MediaType;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The optional `seo` list on the five SEO-able editors (page, artwork, artist, exhibition, article): one entry per
 * locale with a title, description and OG/share image (a media id). An entry whose three values are all empty clears
 * that locale's override; locales that are not sent are left untouched; omitting `seo` changes nothing.
 * The description limit matches what the public head renders (SeoText::description truncates at 160).
 */
trait ValidatesSeoPayload
{
    protected function seoRules(): array
    {
        return [
            'seo' => ['sometimes', 'array', 'max:'.count(Locale::cases())],
            'seo.*.locale' => ['required', Rule::enum(Locale::class)],
            'seo.*.title' => ['nullable', 'string', 'max:255'],
            'seo.*.description' => ['nullable', 'string', 'max:160'],
            'seo.*.og_image_id' => [
                'nullable', 'integer',
                Rule::exists('media', 'id')->whereNull('deleted_at')->where('type', MediaType::Image->value),
            ],
        ];
    }

    protected function rejectDuplicateSeoLocales(Validator $validator): void
    {
        $locales = collect($this->input('seo', []))->pluck('locale')->filter();

        if ($locales->count() !== $locales->unique()->count()) {
            $validator->errors()->add('seo', 'Each locale may only appear once.');
        }
    }
}
