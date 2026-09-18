<?php

namespace App\Models;

use App\Enums\EnquiryStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'enquiry_subject_id', 'artwork_id', 'inventory_code', 'submitted_at', 'name',
    'contact', 'email', 'phone', 'message', 'status', 'internal_note', 'meta', 'ip_address', 'user_agent',
])]
class Enquiry extends Model
{
    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'status' => EnquiryStatus::class,
            'meta' => 'array',
        ];
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(EnquirySubject::class, 'enquiry_subject_id');
    }

    public function artwork(): BelongsTo
    {
        return $this->belongsTo(Artwork::class);
    }

    public function replies(): HasMany
    {
        return $this->hasMany(EnquiryReply::class);
    }
}
