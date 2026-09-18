<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreEnquiryRequest;
use App\Models\Artwork;
use App\Services\Api\EnquiryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class EnquiryController extends Controller
{
    public function __construct(private EnquiryService $enquiries) {}

    public function store(StoreEnquiryRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (! empty($data['website'])) {
            // Honeypot tripped: fake the normal success response so a bot
            // gets no signal it was caught, but persist nothing.
            Log::info('Enquiry honeypot triggered.', ['ip' => $request->ip()]);

            return response()->json(['message' => 'Sorğunuz qeydə alındı.'], 201);
        }

        $artwork = null;
        if ($data['subject'] === 'buy') {
            $artwork = Artwork::query()->where('inventory_code', $data['artwork_code'])->firstOrFail();
        }

        $this->enquiries->createFromPublicSubmission($artwork, $data, $request->ip(), $request->userAgent());

        return response()->json(['message' => 'Sorğunuz qeydə alındı.'], 201);
    }
}
