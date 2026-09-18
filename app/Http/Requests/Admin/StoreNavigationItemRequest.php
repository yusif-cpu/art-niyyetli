<?php

namespace App\Http\Requests\Admin;

use App\Enums\NavPlacement;
use App\Enums\NavRouteKey;
use App\Enums\NavType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNavigationItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        $placement = $this->input('placement');

        return [
            'placement' => ['required', Rule::enum(NavPlacement::class)],
            'nav_type' => ['required', Rule::enum(NavType::class)],

            'page_id' => [
                Rule::requiredIf($this->input('nav_type') === NavType::Page->value),
                Rule::prohibitedIf($this->input('nav_type') === NavType::Route->value),
                'integer',
                Rule::exists('pages', 'id')->whereNull('deleted_at'),
                Rule::unique('navigation_items', 'page_id')->where(fn ($query) => $query->where('placement', $placement)),
            ],
            'route_key' => [
                Rule::requiredIf($this->input('nav_type') === NavType::Route->value),
                Rule::prohibitedIf($this->input('nav_type') === NavType::Page->value),
                Rule::enum(NavRouteKey::class),
                Rule::unique('navigation_items', 'route_key')->where(fn ($query) => $query->where('placement', $placement)),
            ],
        ];
    }
}
