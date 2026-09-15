<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return [
            'alt_text' => ['required', 'array'],
            'alt_text.az' => ['nullable', 'string', 'max:255'],
            'alt_text.en' => ['nullable', 'string', 'max:255'],
        ];
    }
}
