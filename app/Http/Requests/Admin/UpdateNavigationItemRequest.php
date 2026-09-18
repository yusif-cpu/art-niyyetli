<?php

namespace App\Http\Requests\Admin;

use App\Enums\NavPlacement;
use App\Models\NavigationItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNavigationItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // route-level `can:admin.access` already gates this
    }

    public function rules(): array
    {
        // What a nav item points to (nav_type/page_id/route_key) is immutable after
        // creation — to change the target, remove the item and add the right one.
        // Only where it sits (placement) and whether it's shown (is_visible) can change.
        return [
            'placement' => ['sometimes', Rule::enum(NavPlacement::class)],
            'is_visible' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->filled('placement')) {
                return;
            }

            $item = $this->route('navigation');
            $placement = $this->input('placement');

            $duplicate = NavigationItem::query()
                ->where('placement', $placement)
                ->where('id', '!=', $item->id)
                ->when($item->page_id, fn ($q) => $q->where('page_id', $item->page_id))
                ->when($item->route_key, fn ($q) => $q->where('route_key', $item->route_key->value))
                ->exists();

            if ($duplicate) {
                $validator->errors()->add('placement', 'This item already exists in the target placement.');
            }
        });
    }
}
