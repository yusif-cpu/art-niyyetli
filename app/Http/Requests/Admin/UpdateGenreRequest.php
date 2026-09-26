<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\ValidatesCatalogTermPayload;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateGenreRequest extends FormRequest
{
    use ValidatesCatalogTermPayload;

    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        return $this->catalogTermRules('genres', partial: true, ignoreId: $this->route('genre')?->id);
    }

    public function withValidator(Validator $validator): void
    {
        $this->validateCatalogTermTranslations($validator, $this->route('genre'));
    }
}
