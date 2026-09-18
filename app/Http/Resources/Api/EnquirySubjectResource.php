<?php

namespace App\Http\Resources\Api;

use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EnquirySubjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = LocaleResolver::resolve($request);
        $fields = LocalizedFields::resolve($this->translations, $locale, ['name']);

        return [
            'key' => $this->key,
            'label' => $fields['name'],
        ];
    }
}
