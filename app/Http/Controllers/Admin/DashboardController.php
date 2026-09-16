<?php

namespace App\Http\Controllers\Admin;

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
            ],
        ]);
    }
}
