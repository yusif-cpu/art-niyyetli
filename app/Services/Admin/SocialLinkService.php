<?php

namespace App\Services\Admin;

use App\Models\SocialLink;

class SocialLinkService
{
    public const LOGO_RELATIONS = ['logoMedia.variants'];

    public function create(array $data): SocialLink
    {
        if (! isset($data['sort_order'])) {
            $data['sort_order'] = ((int) SocialLink::max('sort_order')) + 1;
        }

        return SocialLink::create($data)->fresh(self::LOGO_RELATIONS);
    }

    public function update(SocialLink $link, array $data): SocialLink
    {
        $link->update($data);

        return $link->fresh(self::LOGO_RELATIONS);
    }

    public function delete(SocialLink $link): void
    {
        $link->delete();
    }

    public function reorder(array $items): void
    {
        foreach ($items as $item) {
            SocialLink::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }
    }
}
