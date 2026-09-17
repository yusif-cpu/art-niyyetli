<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\UserGuardException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\Admin\UserResource;
use App\Models\User;
use App\Services\Admin\UserService;
use Illuminate\Http\JsonResponse;

class UserManagementController extends Controller
{
    public function __construct(private UserService $users) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'users' => UserResource::collection(User::query()->with('roles')->get()),
        ]);
    }

    public function store(StoreUserRequest $request): UserResource
    {
        return new UserResource($this->users->create($request->validated()));
    }

    public function update(UpdateUserRequest $request, User $user): UserResource|JsonResponse
    {
        try {
            $user = $this->users->update($user, $request->validated());
        } catch (UserGuardException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return new UserResource($user);
    }

    public function destroy(User $user): JsonResponse
    {
        try {
            $this->users->delete($user);
        } catch (UserGuardException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['message' => 'User removed.']);
    }
}
