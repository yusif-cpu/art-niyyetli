<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route-level `can:admin.manage-users` already gates this
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', Rule::unique('users', 'username')],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', Password::min(12)->letters()->numbers(), 'max:255'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => [Rule::in(['administrator', 'editor'])],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
