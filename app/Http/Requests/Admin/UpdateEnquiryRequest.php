<?php

namespace App\Http\Requests\Admin;

use App\Enums\EnquiryStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEnquiryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', Rule::enum(EnquiryStatus::class)],
            'internal_note' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}
