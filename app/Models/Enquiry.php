<?php

namespace App\Models;

use App\Enums\EnquiryStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'enquiry_subject_id', 'artwork_id', 'inventory_code', 'submitted_at', 'name',
    'contact', 'message', 'status', 'internal_note', 'ip_address', 'user_agent',
])]
class Enquiry extends Model
{
    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'status' => EnquiryStatus::class,
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
}
