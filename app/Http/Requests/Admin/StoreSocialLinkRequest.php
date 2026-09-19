<?php

namespace App\Http\Requests\Admin;

use App\Enums\LogoDisplayMode;
use App\Http\Requests\Admin\Concerns\ValidatesSocialLinkPayload;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreSocialLinkRequest extends FormRequest
{
    use ValidatesSocialLinkPayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return [
            'platform' => ['required', 'string', 'max:100'],
            'url' => ['required', 'string', 'max:2048', 'url'],
            'logo_media_id' => ['nullable', 'integer', $this->logoMediaExistsRule()],
            'display_mode' => ['sometimes', Rule::enum(LogoDisplayMode::class)],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectDangerousUrlScheme($validator);
            $this->requireLogoForLogoOnlyMode($validator);
        });
    }
}
