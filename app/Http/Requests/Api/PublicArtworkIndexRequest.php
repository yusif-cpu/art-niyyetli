<?php

namespace App\Http\Requests\Api;

use App\Enums\ArtworkAvailability;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublicArtworkIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'artist' => ['sometimes', 'integer', 'min:1'],
            'genre' => ['sometimes', 'string', 'max:100'],
            'medium' => ['sometimes', 'string', 'max:100'],
            'status' => ['sometimes', Rule::enum(ArtworkAvailability::class)],
            'price_min' => ['sometimes', 'numeric', 'min:0'],
            // `gte:price_min` on its own fails when price_min is absent, so it only applies alongside it.
            'price_max' => ['sometimes', 'numeric', 'min:0', Rule::when($this->filled('price_min'), 'gte:price_min')],
            'size_min' => ['sometimes', 'numeric', 'min:0'],
            'size_max' => ['sometimes', 'numeric', 'min:0', Rule::when($this->filled('size_min'), 'gte:size_min')],
            'sort' => ['sometimes', Rule::in(['newest', 'price_asc', 'price_desc'])],
        ];
    }
}
