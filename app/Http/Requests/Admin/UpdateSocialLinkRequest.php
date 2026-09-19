<?php

namespace App\Http\Requests\Admin;

use App\Enums\LogoDisplayMode;
use App\Http\Requests\Admin\Concerns\ValidatesSocialLinkPayload;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateSocialLinkRequest extends FormRequest
{
    use ValidatesSocialLinkPayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return [
            'platform' => ['sometimes', 'string', 'max:100'],
            'url' => ['sometimes', 'string', 'max:2048', 'url'],
            'logo_media_id' => ['sometimes', 'nullable', 'integer', $this->logoMediaExistsRule()],
            'display_mode' => ['sometimes', Rule::enum(LogoDisplayMode::class)],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->rejectDangerousUrlScheme($validator);
            $this->requireLogoForLogoOnlyMode($validator, $this->route('social_link'));
        });
    }
}
