<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\EnquirySubjectResource;
use App\Models\EnquirySubject;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EnquirySubjectController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $subjects = EnquirySubject::query()
            ->where('is_active', true)
            ->where('key', '!=', 'other')
            ->with('translations')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return EnquirySubjectResource::collection($subjects);
    }
}
