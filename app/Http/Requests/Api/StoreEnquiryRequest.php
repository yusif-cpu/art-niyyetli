<?php

namespace App\Http\Requests\Api;

use App\Enums\ArtworkAvailability;
use App\Models\Artwork;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreEnquiryRequest extends FormRequest
{
    private const ALLOWED_FIELDS = ['name', 'email', 'phone', 'message', 'subject', 'artwork_code', 'website'];

    private const PUBLIC_SUBJECTS = [
        'buy', 'general_contact', 'artist_submission', 'media', 'exhibition_invitation', 'collaboration',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'message' => ['required', 'string', 'max:5000'],
            'subject' => ['required', 'string', Rule::in(self::PUBLIC_SUBJECTS)],
            'artwork_code' => [
                'required_if:subject,buy', 'prohibited_unless:subject,buy', 'string', 'max:100',
                Rule::exists('artworks', 'inventory_code')->where(fn ($q) => $q->where('is_active', true)->whereNull('deleted_at')),
            ],
            'website' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $unexpected = array_diff(array_keys($this->all()), self::ALLOWED_FIELDS);
            if ($unexpected !== []) {
                $validator->errors()->add('_unexpected', 'Unexpected fields: '.implode(', ', $unexpected));
            }

            if ($this->input('subject') === 'buy' && $this->filled('artwork_code') && $validator->errors()->isEmpty()) {
                $artwork = Artwork::query()->where('inventory_code', $this->input('artwork_code'))->first();
                if ($artwork && $artwork->availability === ArtworkAvailability::Sold && ! config('gallery.allow_sold_enquiries')) {
                    $validator->errors()->add('artwork_code', 'Bu əsər üçün artıq sorğu qəbul edilmir.');
                }
            }
        });
    }
}
