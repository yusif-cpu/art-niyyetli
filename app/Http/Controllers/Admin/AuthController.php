<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // Per normalized-username+IP: the primary lock on a specific account being guessed.
    private const MAX_ATTEMPTS_PER_USERNAME_IP = 5;

    // Per IP alone, across all usernames: catches an attacker who rotates the
    // username on every request to dodge the per-username limit above. Set
    // higher than the per-username limit so a handful of legitimate users
    // sharing one office/NAT IP aren't blocked by each other's mistakes.
    private const MAX_ATTEMPTS_PER_IP = 20;

    private const DECAY_SECONDS = 60;

    public function store(LoginRequest $request): JsonResponse
    {
        $usernameIpKey = $this->usernameIpThrottleKey($request);
        $ipKey = $this->ipThrottleKey($request);

        if (RateLimiter::tooManyAttempts($usernameIpKey, self::MAX_ATTEMPTS_PER_USERNAME_IP)
            || RateLimiter::tooManyAttempts($ipKey, self::MAX_ATTEMPTS_PER_IP)) {
            throw ValidationException::withMessages([
                'username' => ['Too many login attempts. Please try again later.'],
            ])->status(429);
        }

        $credentials = $request->validated();

        if (! Auth::attempt(['username' => $credentials['username'], 'password' => $credentials['password']])) {
            RateLimiter::hit($usernameIpKey, self::DECAY_SECONDS);
            RateLimiter::hit($ipKey, self::DECAY_SECONDS);

            throw ValidationException::withMessages([
                'username' => ['These credentials do not match our records.'],
            ]);
        }

        if (! Auth::user()->is_active) {
            Auth::logout();
            RateLimiter::hit($usernameIpKey, self::DECAY_SECONDS);
            RateLimiter::hit($ipKey, self::DECAY_SECONDS);

            throw ValidationException::withMessages([
                'username' => ['These credentials do not match our records.'],
            ]);
        }

        // Only the username+IP counter is cleared: it is specific to the
        // account that just proved ownership. The shared per-IP counter is
        // deliberately left alone — clearing it on any success would let an
        // attacker "buy back" IP-wide attempts by succeeding once on a
        // throwaway account, defeating the protection this limit exists for.
        RateLimiter::clear($usernameIpKey);
        $request->session()->regenerate();

        return response()->json(['message' => 'Authenticated.']);
    }

    public function destroy(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }

    private function usernameIpThrottleKey(Request $request): string
    {
        return 'login:username-ip:'.Str::lower((string) $request->input('username')).'|'.$request->ip();
    }

    private function ipThrottleKey(Request $request): string
    {
        return 'login:ip:'.$request->ip();
    }
}
