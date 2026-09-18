<?php

namespace Tests\Unit\Models;

use App\Models\Enquiry;
use App\Models\EnquirySubject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnquiryTest extends TestCase
{
    use RefreshDatabase;

    public function test_meta_is_cast_to_an_array(): void
    {
        $subject = EnquirySubject::query()->create(['key' => 'buy', 'sort_order' => 0, 'is_active' => true]);

        $enquiry = Enquiry::query()->create([
            'enquiry_subject_id' => $subject->id,
            'submitted_at' => now(),
            'name' => 'Aysel Məmmədova',
            'contact' => 'aysel@example.com',
            'email' => 'aysel@example.com',
            'message' => 'Salam.',
            'status' => 'new',
            'meta' => ['note' => 'test'],
        ]);

        $this->assertSame(['note' => 'test'], $enquiry->refresh()->meta);
    }

    public function test_meta_defaults_to_null(): void
    {
        $subject = EnquirySubject::query()->create(['key' => 'buy', 'sort_order' => 0, 'is_active' => true]);

        $enquiry = Enquiry::query()->create([
            'enquiry_subject_id' => $subject->id,
            'submitted_at' => now(),
            'name' => 'Aysel Məmmədova',
            'contact' => 'aysel@example.com',
            'email' => 'aysel@example.com',
            'message' => 'Salam.',
            'status' => 'new',
        ]);

        $this->assertNull($enquiry->refresh()->meta);
    }
}
