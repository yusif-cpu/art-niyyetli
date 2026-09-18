<?php

namespace App\Services\Admin;

use App\Models\NavigationItem;
use Illuminate\Support\Facades\DB;

class NavigationService
{
    public function create(array $data): NavigationItem
    {
        $data['sort_order'] = $this->nextSortOrder($data['placement']);
        $data['is_visible'] = $data['is_visible'] ?? true;

        $item = NavigationItem::create($data);

        return $item->fresh();
    }

    public function update(NavigationItem $item, array $data): NavigationItem
    {
        $item->update($data);

        return $item->fresh();
    }

    public function delete(NavigationItem $item): void
    {
        $item->delete();
    }

    public function reorder(array $items): void
    {
        DB::transaction(function () use ($items) {
            foreach ($items as $item) {
                NavigationItem::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
            }
        });
    }

    private function nextSortOrder(string $placement): int
    {
        $max = NavigationItem::where('placement', $placement)->max('sort_order');

        return $max === null ? 0 : $max + 1;
    }
}
