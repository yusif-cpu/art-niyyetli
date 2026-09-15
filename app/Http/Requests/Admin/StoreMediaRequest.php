<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class StoreMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                File::types(['jpg', 'jpeg', 'png', 'webp'])->max(config('media.max_upload_kb')),
            ],
            'alt_text' => ['sometimes', 'array'],
            'alt_text.az' => ['nullable', 'string', 'max:255'],
            'alt_text.en' => ['nullable', 'string', 'max:255'],
        ];
    }
}
