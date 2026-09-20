<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route-level `can:admin.manage-users` already gates this
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'username' => ['sometimes', 'string', 'max:255', Rule::unique('users', 'username')->ignore($userId)],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            // Only a password that is being changed is checked; existing passwords are never re-validated.
            'password' => ['sometimes', 'nullable', Password::min(12)->letters()->numbers(), 'max:255'],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => [Rule::in(['administrator', 'editor'])],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
