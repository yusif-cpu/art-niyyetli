<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReorderPageSectionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', Rule::exists('page_sections', 'id')],
            'items.*.sort_order' => ['required', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $ids = collect($this->input('items', []))->pluck('id');

            if ($ids->count() !== $ids->unique()->count()) {
                $validator->errors()->add('items', 'Duplicate section id in the reorder payload.');
            }

            $page = $this->route('page');

            if ($page) {
                $foreignIds = $ids->filter(fn ($id) => ! $page->sections()->where('id', $id)->exists());

                if ($foreignIds->isNotEmpty()) {
                    $validator->errors()->add('items', 'One or more sections do not belong to this page.');
                }
            }
        });
    }
}
