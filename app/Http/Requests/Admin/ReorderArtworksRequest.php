<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReorderArtworksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', Rule::exists('artworks', 'id')->whereNull('deleted_at')],
            'items.*.sort_order' => ['required', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $ids = collect($this->input('items', []))->pluck('id');

            if ($ids->count() !== $ids->unique()->count()) {
                $validator->errors()->add('items', 'Duplicate artwork id in the reorder payload.');
            }
        });
    }
}
