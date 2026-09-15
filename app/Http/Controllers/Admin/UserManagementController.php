<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserManagementController extends Controller
{
    /**
     * Minimal administrator-only stub proving the authorization boundary.
     * Full user-management CRUD is out of scope for this phase.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'users' => User::query()->select(['id', 'name', 'username'])->get(),
        ]);
    }
}
