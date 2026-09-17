<?php

namespace App\Http\Resources\Admin;

use App\Enums\Locale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EnquiryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'message' => $this->message,
            'status' => $this->status->value,
            'internal_note' => $this->internal_note,
            'inventory_code' => $this->inventory_code,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'artwork' => $this->whenLoaded('artwork', fn () => $this->artwork ? [
                'id' => $this->artwork->id,
                'inventory_code' => $this->artwork->inventory_code,
                'title' => $this->artwork->relationLoaded('translations')
                    ? $this->artwork->translations->firstWhere('locale', Locale::Az)?->title
                    : null,
            ] : null),
            'subject' => $this->whenLoaded('subject', fn () => $this->subject?->translations->firstWhere('locale', Locale::Az)?->name),
            'replies' => $this->whenLoaded('replies', fn () => $this->replies->map(fn ($r) => (new EnquiryReplyResource($r))->resolve())->values()),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
