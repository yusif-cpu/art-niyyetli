<?php

namespace App\Http\Resources\Api;

use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FaqResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = LocaleResolver::resolve($request);
        $fields = LocalizedFields::resolve($this->translations, $locale, ['question', 'answer']);

        return [
            'id' => $this->id,
            'question' => $fields['question'],
            'answer' => $fields['answer'],
            'sort_order' => $this->sort_order,
        ];
    }
}
