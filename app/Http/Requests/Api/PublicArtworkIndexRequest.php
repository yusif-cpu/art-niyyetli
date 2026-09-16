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
            'price_max' => ['sometimes', 'numeric', 'min:0', 'gte:price_min'],
            'sort' => ['sometimes', Rule::in(['newest', 'price_asc', 'price_desc'])],
        ];
    }
}
