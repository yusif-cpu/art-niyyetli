<?php

namespace App\Services\Admin;

use App\Exceptions\UserGuardException;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UserService
{
    public function create(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $roles = $data['roles'];
            unset($data['roles']);

            $user = User::create($data);
            $user->roles()->sync(Role::whereIn('name', $roles)->pluck('id'));

            return $user->load('roles');
        });
    }

    public function update(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            if (empty($data['password'])) {
                unset($data['password']);
            }

            $roles = $data['roles'] ?? null;
            unset($data['roles']);

            $deactivating = array_key_exists('is_active', $data) && ! $data['is_active'];
            $revokingAdministrator = $roles !== null && ! in_array('administrator', $roles, true);

            if (($deactivating || $revokingAdministrator) && $user->hasRole('administrator')) {
                $this->assertNotLastActiveAdministrator($user);
            }

            $user->update($data);

            if ($roles !== null) {
                $user->roles()->sync(Role::whereIn('name', $roles)->pluck('id'));
            }

            return $user->load('roles');
        });
    }

    public function delete(User $user): void
    {
        $this->assertNotLastActiveAdministrator($user);

        $user->delete();
    }

    private function assertNotLastActiveAdministrator(User $user): void
    {
        if (! $user->hasRole('administrator')) {
            return;
        }

        $otherActiveAdministratorExists = User::whereHas('roles', fn ($q) => $q->where('name', 'administrator'))
            ->where('is_active', true)
            ->where('id', '!=', $user->id)
            ->exists();

        if (! $otherActiveAdministratorExists) {
            throw new UserGuardException('Son aktiv administrator hesabı silinə və ya deaktiv edilə bilməz.');
        }
    }
}
