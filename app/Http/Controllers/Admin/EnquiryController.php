<?php

namespace App\Http\Controllers\Admin;

use App\Enums\EnquiryStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SendEnquiryReplyRequest;
use App\Http\Requests\Admin\UpdateEnquiryRequest;
use App\Http\Resources\Admin\EnquiryReplyResource;
use App\Http\Resources\Admin\EnquiryResource;
use App\Mail\EnquiryReplyMail;
use App\Models\Enquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class EnquiryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Enquiry::query()->with(['artwork.translations', 'subject.translations']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('artwork_id')) {
            $query->where('artwork_id', $request->integer('artwork_id'));
        }
        if ($request->filled('subject')) {
            $query->whereHas('subject', fn ($q) => $q->where('key', $request->query('subject')));
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

        $enquiries = $query
            ->orderByRaw("CASE WHEN status = 'new' THEN 0 ELSE 1 END")
            ->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        return EnquiryResource::collection($enquiries);
    }

    /**
     * Minimal polling endpoint for the admin's live new-enquiry notification.
     * Deliberately exposes only enough to detect newly created enquiries —
     * no names, emails, or messages — so it stays cheap to poll frequently.
     */
    public function status(): JsonResponse
    {
        return response()->json(['data' => [
            'latest_id' => Enquiry::max('id'),
            'new_count' => Enquiry::where('status', EnquiryStatus::New)->count(),
            'total_count' => Enquiry::count(),
        ]]);
    }

    public function show(Enquiry $enquiry): EnquiryResource
    {
        $enquiry->load(['artwork.translations', 'subject.translations', 'replies' => fn ($q) => $q->latest()]);

        return new EnquiryResource($enquiry);
    }

    public function update(UpdateEnquiryRequest $request, Enquiry $enquiry): EnquiryResource
    {
        $enquiry->update($request->validated());

        return $this->show($enquiry);
    }

    public function reply(SendEnquiryReplyRequest $request, Enquiry $enquiry): EnquiryReplyResource|JsonResponse
    {
        $data = $request->validated();

        if (blank($enquiry->email)) {
            return response()->json(['message' => 'Bu sorğuda müştərinin e-poçt ünvanı yoxdur, cavab göndərilə bilməz.'], 422);
        }

        $status = 'failed';

        try {
            Mail::to($enquiry->email)->send(new EnquiryReplyMail($enquiry, $data['subject'], $data['message']));
            $status = 'sent';
        } catch (Throwable $e) {
            Log::error('Failed to send enquiry reply', ['enquiry_id' => $enquiry->id, 'error' => $e->getMessage()]);
        }

        $reply = $enquiry->replies()->create([
            'user_id' => $request->user()->id,
            'recipient' => $enquiry->email,
            'subject' => $data['subject'],
            'message' => $data['message'],
            'status' => $status,
            'sent_at' => $status === 'sent' ? now() : null,
        ]);

        if ($status === 'sent') {
            $enquiry->update(['status' => EnquiryStatus::Replied]);
        }

        if ($status === 'failed') {
            return response()->json(['message' => 'Cavab göndərilə bilmədi. Zəhmət olmasa yenidən cəhd edin.'], 502);
        }

        return new EnquiryReplyResource($reply);
    }
}
