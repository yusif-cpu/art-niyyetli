<?php

namespace App\Services\Admin;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\DB;

class SiteSettingService
{
    public const ALLOWED_KEYS = ['contact_email', 'phone', 'address', 'opening_hours', 'footer_text'];

    public function all(): array
    {
        $rows = SiteSetting::query()->whereIn('key', self::ALLOWED_KEYS)->pluck('value', 'key');

        return array_merge(array_fill_keys(self::ALLOWED_KEYS, null), $rows->all());
    }

    public function update(array $data): array
    {
        // Belt-and-suspenders: even if a caller bypassed the Form Request layer,
        // only the allowlisted keys can ever be written through this method.
        $allowed = array_intersect_key($data, array_flip(self::ALLOWED_KEYS));

        DB::transaction(function () use ($allowed) {
            foreach ($allowed as $key => $value) {
                SiteSetting::query()->updateOrCreate(
                    ['key' => $key],
                    ['value' => $value ?? '', 'type' => 'string']
                );
            }
        });

        return $this->all();
    }
}
