<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSiteSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return [
            'contact_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'opening_hours' => ['sometimes', 'nullable', 'string', 'max:255'],
            'footer_text' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'whatsapp_number' => ['sometimes', 'nullable', 'string', 'max:50'],
        ];
    }
}
