<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateEnquiryRequest;
use App\Http\Resources\Admin\EnquiryResource;
use App\Models\Enquiry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EnquiryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Enquiry::query()->with(['artwork.translations']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('artwork_id')) {
            $query->where('artwork_id', $request->integer('artwork_id'));
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->query('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->query('to'));
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('inventory_code', 'like', "%{$search}%");
            });
        }

        $perPage = min(100, max(1, $request->integer('per_page', 20)));

        $enquiries = $query->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();

        return EnquiryResource::collection($enquiries);
    }

    public function show(Enquiry $enquiry): EnquiryResource
    {
        $enquiry->load('artwork.translations');

        return new EnquiryResource($enquiry);
    }

    public function update(UpdateEnquiryRequest $request, Enquiry $enquiry): EnquiryResource
    {
        $enquiry->update($request->validated());

        return $this->show($enquiry);
    }
}
