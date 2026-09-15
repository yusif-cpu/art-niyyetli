<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
            ],
        ]);
    }
}
