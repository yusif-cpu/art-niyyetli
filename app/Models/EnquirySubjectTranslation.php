<?php

namespace App\Models;

use App\Enums\Locale;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['enquiry_subject_id', 'locale', 'name'])]
class EnquirySubjectTranslation extends Model
{
    protected function casts(): array
    {
        return ['locale' => Locale::class];
    }

    public function enquirySubject(): BelongsTo
    {
        return $this->belongsTo(EnquirySubject::class);
    }
}
