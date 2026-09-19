<?php

namespace App\Http\Requests\Admin;

use App\Enums\LogoDisplayMode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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

            'brand_text' => ['sometimes', 'nullable', 'string', 'max:255'],
            'logo_media_id' => ['sometimes', 'nullable', 'integer', Rule::exists('media', 'id')->whereNull('deleted_at')],
            'logo_display_mode' => ['sometimes', 'nullable', Rule::enum(LogoDisplayMode::class)],
        ];
    }
}
