<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ExhibitionStatus;
use App\Enums\Locale;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Artist;
use App\Models\Artwork;
use App\Models\Enquiry;
use App\Models\Exhibition;
use App\Models\Faq;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Authenticated admin access confirmed.',
            'user' => [
                'id' => $request->user()->id,
                'username' => $request->user()->username,
                'roles' => $request->user()->roles()->pluck('name'),
            ],
            'stats' => [
                'artists' => Artist::count(),
                'artworks' => Artwork::count(),
                'exhibitions' => Exhibition::count(),
                'articles' => Article::count(),
                'faqs' => Faq::count(),
                'enquiries' => Enquiry::count(),
                'enquiries_new' => Enquiry::where('status', 'new')->count(),
            ],
            'recent_enquiries' => Enquiry::latest('submitted_at')->take(5)->get()
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'name' => $e->name,
                    'status' => $e->status->value,
                    'created_at' => $e->created_at->toIso8601String(),
                    'inventory_code' => $e->inventory_code,
                ]),
            'upcoming_exhibitions' => Exhibition::where('status', ExhibitionStatus::Upcoming)
                ->orderBy('start_date')->take(5)->with('translations')->get()
                ->map(fn ($ex) => [
                    'id' => $ex->id,
                    'title' => $ex->translations->firstWhere('locale', Locale::Az)?->title,
                    'start_date' => $ex->start_date?->toDateString(),
                    'end_date' => $ex->end_date?->toDateString(),
                ]),
            'recent_artworks' => Artwork::latest()->take(5)->with('translations')->get()
                ->map(fn ($a) => [
                    'id' => $a->id,
                    'title' => $a->translations->firstWhere('locale', Locale::Az)?->title,
                    'inventory_code' => $a->inventory_code,
                    'created_at' => $a->created_at->toIso8601String(),
                ]),
        ]);
    }
}
