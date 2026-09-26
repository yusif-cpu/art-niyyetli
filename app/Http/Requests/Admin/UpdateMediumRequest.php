<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\ValidatesCatalogTermPayload;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateMediumRequest extends FormRequest
{
    use ValidatesCatalogTermPayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return $this->catalogTermRules('mediums', partial: true, ignoreId: $this->route('medium')?->id);
    }

    public function withValidator(Validator $validator): void
    {
        $this->validateCatalogTermTranslations($validator, $this->route('medium'));
    }
}
