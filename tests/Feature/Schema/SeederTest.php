<?php

namespace Tests\Feature\Schema;

use App\Models\EnquirySubject;
use App\Models\EnquirySubjectTranslation;
use App\Models\Role;
use Database\Seeders\EnquirySubjectSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_role_and_enquiry_subject_seeders_are_idempotent(): void
    {
        $this->seed(RoleSeeder::class);
        $this->seed(EnquirySubjectSeeder::class);
        $this->seed(RoleSeeder::class);
        $this->seed(EnquirySubjectSeeder::class);

        $this->assertSame(2, Role::count());
        $this->assertSame(7, EnquirySubject::count());
        $this->assertSame(14, EnquirySubjectTranslation::count());
    }
}
