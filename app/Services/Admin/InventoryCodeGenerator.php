<?php

namespace App\Services\Admin;

use App\Models\Artwork;

class InventoryCodeGenerator
{
    public function suggestSequenceStart(int $year): int
    {
        return Artwork::withTrashed()->whereYear('created_at', $year)->count() + 1;
    }

    public function format(int $year, int $sequence): string
    {
        return sprintf('AN-%d-%03d', $year, $sequence);
    }
}
