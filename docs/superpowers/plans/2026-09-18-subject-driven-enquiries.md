# Subject-Driven Enquiry System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the public API, admin panel, and public site accept and manage 6 enquiry subjects (`buy`, `general_contact`, `artist_submission`, `media`, `exhibition_invitation`, `collaboration`) through the existing single `enquiries` table/endpoint, with `other` preserved for historical/admin use only, and with the existing artwork purchase-enquiry flow completely unchanged in behavior.

**Architecture:** Reuse the existing `enquiries` table, `EnquiryService`, and `POST /api/v1/enquiries` endpoint. Add one nullable `meta` JSON column (unpopulated in this phase), make `subject` an explicit required input with conditional `artwork_code` validation, add a small `GET /api/v1/enquiry-subjects` lookup endpoint, and extend the admin/public UIs to filter/select by subject instead of assuming every enquiry is an artwork enquiry.

**Tech Stack:** Laravel 11 (PHP), MySQL, Pest-run PHPUnit-style test classes (`php artisan test`), Laravel Pint; React (JSX) public/admin frontends, Vitest + Testing Library, plain `fetch`-based API clients (no router/state library).

**Spec:** `docs/superpowers/specs/2026-09-18-subject-driven-enquiries-design.md`

## Global Constraints

- Only these 6 keys are publicly selectable: `buy`, `general_contact`, `artist_submission`, `media`, `exhibition_invitation`, `collaboration`. `other` is never returned by the public subjects endpoint and never accepted by the public POST endpoint's `subject` validation.
- `artwork_code` is required only for `subject=buy` and prohibited for every other subject.
- `meta` stays `null` for every enquiry created in this phase — no subject-specific structured fields are added, and the public API rejects any `meta` input as an unexpected field.
- No per-subject notification routing — every subject notifies the existing single `contact_email` recipient exactly as today.
- No public file/attachment upload of any kind.
- Existing rate limiting (`throttle:enquiry-submission` 5/hr/IP, `throttle:public-api` 60/min/IP) and the honeypot (`website` field) must not be touched or weakened.
- `POST /api/v1/enquiries` response shape stays exactly `{"message": "Sorğunuz qeydə alındı."}`.
- The existing `subject=buy` artwork purchase-enquiry behavior, validation, and mail headers must remain unchanged — every pre-existing test for that flow must keep passing without modification unless a step below says otherwise.

## Task Dependency Order

`1 → 2 → 3 → {4, 5, 6} → {7, 8} → 9 → 10 → 11 → 12`

(Tasks 4, 5, 6 only need 1–3 done. Tasks 7–8 need 6's backend filter and the existing admin screens. Task 9 needs nothing but the component itself; 10 needs 4; 11 needs 9 and 10; 12 needs everything.)

---

### Task 1: `meta` column and `Enquiry` model support

**Files:**
- Create: `database/migrations/2026_09_20_000001_add_meta_to_enquiries_table.php`
- Modify: `app/Models/Enquiry.php`
- Test: `tests/Unit/Models/EnquiryTest.php` (new)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `Enquiry::$meta` (array-cast, nullable) — every later task that creates an `Enquiry` may now pass `'meta' => null` (or, in the future, an array) to `Enquiry::create()`.

- [ ] **Step 1: Write the failing test**

```php
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run (inside the app container): `php artisan test --filter=EnquiryTest`
Expected: FAIL — `SQLSTATE[42S22]: Column not found: 'meta'` (or a mass-assignment error, since `meta` isn't fillable yet).

- [ ] **Step 3: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->json('meta')->nullable()->after('internal_note');
        });
    }

    public function down(): void
    {
        Schema::table('enquiries', function (Blueprint $table) {
            $table->dropColumn('meta');
        });
    }
};
```

- [ ] **Step 4: Update the `Enquiry` model**

In `app/Models/Enquiry.php`, add `'meta'` to the `#[Fillable]` list and to the casts:

```php
#[Fillable([
    'enquiry_subject_id', 'artwork_id', 'inventory_code', 'submitted_at', 'name',
    'contact', 'email', 'phone', 'message', 'status', 'internal_note', 'meta', 'ip_address', 'user_agent',
])]
class Enquiry extends Model
{
    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'status' => EnquiryStatus::class,
            'meta' => 'array',
        ];
    }
    // ... relations unchanged
}
```

- [ ] **Step 5: Run the migration and the test to verify it passes**

Run: `php artisan migrate` then `php artisan test --filter=EnquiryTest`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add database/migrations/2026_09_20_000001_add_meta_to_enquiries_table.php app/Models/Enquiry.php tests/Unit/Models/EnquiryTest.php
git commit -m "feat(enquiries): add nullable meta JSON column"
```

---

### Task 2: Subject seed data (6 public subjects + `other`)

**Files:**
- Modify: `database/seeders/EnquirySubjectSeeder.php`
- Modify: `tests/Feature/Schema/SeederTest.php` (existing counts change)

**Interfaces:**
- Consumes: nothing new.
- Produces: seeded `EnquirySubject` rows with keys `buy`, `general_contact`, `artist_submission`, `media`, `exhibition_invitation`, `collaboration`, `other` — later tasks (3, 4, 6, 7) reference these exact key strings.

- [ ] **Step 1: Update the failing assertion first**

Modify `tests/Feature/Schema/SeederTest.php`'s existing test to the new expected counts (7 subjects × 2 locales = 14 translations):

```php
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=SeederTest`
Expected: FAIL — `Failed asserting that 3 matches expected 7.` (seeder hasn't changed yet).

- [ ] **Step 3: Update the seeder**

Replace the `$subjects` array in `database/seeders/EnquirySubjectSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\EnquirySubject;
use Illuminate\Database\Seeder;

class EnquirySubjectSeeder extends Seeder
{
    public function run(): void
    {
        $subjects = [
            ['key' => 'buy', 'sort_order' => 0, 'az' => 'Əsər almaq', 'en' => 'Buy an artwork'],
            ['key' => 'general_contact', 'sort_order' => 1, 'az' => 'Ümumi əlaqə', 'en' => 'General contact'],
            ['key' => 'artist_submission', 'sort_order' => 2, 'az' => 'Rəssam müraciəti', 'en' => 'Artist submission'],
            ['key' => 'media', 'sort_order' => 3, 'az' => 'Media sorğusu', 'en' => 'Media enquiry'],
            ['key' => 'exhibition_invitation', 'sort_order' => 4, 'az' => 'Sərgi / dəvət', 'en' => 'Exhibition / invitation'],
            ['key' => 'collaboration', 'sort_order' => 5, 'az' => 'Əməkdaşlıq', 'en' => 'Collaboration'],
            ['key' => 'other', 'sort_order' => 2, 'az' => 'Digər', 'en' => 'Other'],
        ];

        foreach ($subjects as $data) {
            $subject = EnquirySubject::query()->updateOrCreate(
                ['key' => $data['key']],
                ['sort_order' => $data['sort_order']]
            );

            foreach (['az', 'en'] as $locale) {
                $subject->translations()->updateOrCreate(
                    ['locale' => $locale],
                    ['name' => $data[$locale]]
                );
            }
        }
    }
}
```

Note: `other`'s `sort_order` (2) intentionally still matches `artist_submission`'s new value — `other` is excluded from every public listing by key, not by sort position, so this is harmless and `other`'s row is otherwise left exactly as it was.

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --filter=SeederTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add database/seeders/EnquirySubjectSeeder.php tests/Feature/Schema/SeederTest.php
git commit -m "feat(enquiries): seed general_contact, media, exhibition_invitation, collaboration subjects"
```

---

### Task 3: Public API — subject-driven enquiry creation

**Files:**
- Modify: `app/Http/Requests/Api/StoreEnquiryRequest.php`
- Modify: `app/Http/Controllers/Api/V1/EnquiryController.php`
- Modify: `app/Services/Api/EnquiryService.php`
- Modify: `tests/Feature/Api/EnquiryApiTest.php`
- Test: `tests/Unit/Services/EnquiryServiceTest.php` (one new test; existing tests unmodified)

**Interfaces:**
- Consumes: `Enquiry::$meta` (Task 1), seeded subject keys (Task 2).
- Produces: `EnquiryService::createFromPublicSubmission(?Artwork $artwork, array $data, ?string $ip, ?string $userAgent): Enquiry` — the new signature every caller (controller, tests) must use from here on. `$data['subject']` is guaranteed by validation to be one of the 6 public keys whenever it comes through the HTTP endpoint.

- [ ] **Step 1: Write the failing tests**

In `tests/Feature/Api/EnquiryApiTest.php`, change the `payload()` helper's default and add new test methods (keep every existing test method as-is):

```php
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Aysel Məmmədova',
            'email' => 'aysel@example.com',
            'phone' => '+994501234567',
            'message' => 'Bu əsər haqqında məlumat almaq istəyirəm.',
            'subject' => 'buy',
        ], $overrides);
    }
```

Add these new test methods to the same class:

```php
    public function test_missing_subject_returns_422(): void
    {
        $artwork = $this->makeArtwork();
        $payload = $this->payload(['artwork_code' => $artwork->inventory_code]);
        unset($payload['subject']);

        $response = $this->postJson('/api/v1/enquiries', $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('subject');
    }

    public function test_other_subject_is_rejected(): void
    {
        $response = $this->postJson('/api/v1/enquiries', $this->payload(['subject' => 'other']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('subject');
    }

    public function test_unknown_subject_is_rejected(): void
    {
        $response = $this->postJson('/api/v1/enquiries', $this->payload(['subject' => 'not-a-real-subject']));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('subject');
    }

    public function test_artwork_code_is_prohibited_for_non_buy_subjects(): void
    {
        $artwork = $this->makeArtwork();

        $response = $this->postJson('/api/v1/enquiries', $this->payload([
            'subject' => 'general_contact',
            'artwork_code' => $artwork->inventory_code,
        ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('artwork_code');
    }

    public function test_meta_field_in_payload_is_rejected(): void
    {
        $artwork = $this->makeArtwork();

        $response = $this->postJson('/api/v1/enquiries', $this->payload([
            'artwork_code' => $artwork->inventory_code,
            'meta' => ['note' => 'x'],
        ]));

        $response->assertStatus(422);
    }

    public function test_valid_submission_for_each_non_artwork_subject_creates_enquiry_and_sends_notification(): void
    {
        Mail::fake();
        config(['gallery.enquiry_notification_email' => 'gallery@example.com']);

        foreach (['general_contact', 'artist_submission', 'media', 'exhibition_invitation', 'collaboration'] as $subject) {
            $response = $this->postJson('/api/v1/enquiries', $this->payload(['subject' => $subject]));

            $response->assertStatus(201);
        }

        $this->assertDatabaseCount('enquiries', 5);
        $this->assertDatabaseHas('enquiries', ['email' => 'aysel@example.com', 'artwork_id' => null, 'meta' => null]);
        Mail::assertSent(NewEnquiryReceived::class, 5);
    }
```

In `tests/Unit/Services/EnquiryServiceTest.php`, add one new test (do not modify any existing method):

```php
    public function test_creates_enquiry_for_non_buy_subject_without_artwork(): void
    {
        Mail::fake();

        $data = array_merge($this->validData(), ['subject' => 'general_contact']);
        $enquiry = app(EnquiryService::class)->createFromPublicSubmission(null, $data, null, null);

        $this->assertDatabaseHas('enquiries', [
            'id' => $enquiry->id,
            'artwork_id' => null,
            'inventory_code' => null,
            'meta' => null,
        ]);

        $subject = EnquirySubject::query()->where('key', 'general_contact')->first();
        $this->assertNotNull($subject);
        $this->assertSame($subject->id, $enquiry->enquiry_subject_id);
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --filter=EnquiryApiTest`
Expected: FAIL — every test now 422s or errors because `subject` isn't validated/consumed yet, and `payload()`'s new `subject` key trips the "unexpected field" guard on unmodified older tests too.

Run: `php artisan test --filter=EnquiryServiceTest`
Expected: the new test FAILs (service signature doesn't accept a nullable `$artwork` the way the test calls it — or it errors trying to look up `'buy'` regardless of `$data['subject']`).

- [ ] **Step 3: Update `StoreEnquiryRequest`**

```php
<?php

namespace App\Http\Requests\Api;

use App\Enums\ArtworkAvailability;
use App\Models\Artwork;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreEnquiryRequest extends FormRequest
{
    private const ALLOWED_FIELDS = ['name', 'email', 'phone', 'message', 'subject', 'artwork_code', 'website'];

    private const PUBLIC_SUBJECTS = [
        'buy', 'general_contact', 'artist_submission', 'media', 'exhibition_invitation', 'collaboration',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'message' => ['required', 'string', 'max:5000'],
            'subject' => ['required', 'string', Rule::in(self::PUBLIC_SUBJECTS)],
            'artwork_code' => [
                'required_if:subject,buy', 'prohibited_unless:subject,buy', 'string', 'max:100',
                Rule::exists('artworks', 'inventory_code')->where(fn ($q) => $q->where('is_active', true)->whereNull('deleted_at')),
            ],
            'website' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $unexpected = array_diff(array_keys($this->all()), self::ALLOWED_FIELDS);
            if ($unexpected !== []) {
                $validator->errors()->add('_unexpected', 'Unexpected fields: '.implode(', ', $unexpected));
            }

            if ($this->input('subject') === 'buy' && $this->filled('artwork_code') && $validator->errors()->isEmpty()) {
                $artwork = Artwork::query()->where('inventory_code', $this->input('artwork_code'))->first();
                if ($artwork && $artwork->availability === ArtworkAvailability::Sold && ! config('gallery.allow_sold_enquiries')) {
                    $validator->errors()->add('artwork_code', 'Bu əsər üçün artıq sorğu qəbul edilmir.');
                }
            }
        });
    }
}
```

- [ ] **Step 4: Update the public `EnquiryController@store`**

In `app/Http/Controllers/Api/V1/EnquiryController.php`, replace the body of `store()`:

```php
    public function store(StoreEnquiryRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (! empty($data['website'])) {
            // Honeypot tripped: fake the normal success response so a bot
            // gets no signal it was caught, but persist nothing.
            Log::info('Enquiry honeypot triggered.', ['ip' => $request->ip()]);

            return response()->json(['message' => 'Sorğunuz qeydə alındı.'], 201);
        }

        $artwork = null;
        if ($data['subject'] === 'buy') {
            $artwork = Artwork::query()->where('inventory_code', $data['artwork_code'])->firstOrFail();
        }

        $this->enquiries->createFromPublicSubmission($artwork, $data, $request->ip(), $request->userAgent());

        return response()->json(['message' => 'Sorğunuz qeydə alındı.'], 201);
    }
```

(The class already imports `App\Models\Artwork`; no import changes needed.)

- [ ] **Step 5: Update `EnquiryService::createFromPublicSubmission`**

In `app/Services/Api/EnquiryService.php`:

```php
    public function createFromPublicSubmission(?Artwork $artwork, array $data, ?string $ip, ?string $userAgent): Enquiry
    {
        $enquiry = DB::transaction(function () use ($artwork, $data, $ip, $userAgent) {
            $subject = EnquirySubject::query()->firstOrCreate(
                ['key' => $data['subject'] ?? 'buy'],
                ['sort_order' => 0, 'is_active' => true]
            );

            return Enquiry::query()->create([
                'enquiry_subject_id' => $subject->id,
                'artwork_id' => $artwork?->id,
                'inventory_code' => $artwork?->inventory_code,
                'submitted_at' => now(),
                'name' => $data['name'],
                'contact' => $data['email'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'message' => $data['message'],
                'status' => 'new',
                'meta' => null,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
            ]);
        });

        $this->sendNotification($enquiry);

        return $enquiry;
    }
```

Only the method signature (`?Artwork $artwork` instead of `Artwork $artwork`), the subject lookup key, the two `$artwork?->` null-safe accesses, and the added `'meta' => null` line change. `sendNotification()` is untouched by this task (Task 5 touches it).

The `$data['subject'] ?? 'buy'` fallback is deliberate: it keeps `EnquiryServiceTest::test_creates_enquiry_and_resolves_buy_subject_without_seeder` passing unmodified — that test calls the service directly with no `subject` key and no seeder run, and must still resolve/create the `buy` subject exactly as before.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test --filter=EnquiryApiTest`
Expected: PASS — including every pre-existing test method in the file, unmodified except for the `payload()` default.

Run: `php artisan test --filter=EnquiryServiceTest`
Expected: PASS — all 6 pre-existing tests plus the 1 new one.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Requests/Api/StoreEnquiryRequest.php app/Http/Controllers/Api/V1/EnquiryController.php app/Services/Api/EnquiryService.php tests/Feature/Api/EnquiryApiTest.php tests/Unit/Services/EnquiryServiceTest.php
git commit -m "feat(enquiries): accept all 6 public subjects on the enquiry endpoint"
```

---

### Task 4: `GET /api/v1/enquiry-subjects`

**Files:**
- Create: `app/Http/Resources/Api/EnquirySubjectResource.php`
- Create: `app/Http/Controllers/Api/V1/EnquirySubjectController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/EnquirySubjectsApiTest.php` (new)

**Interfaces:**
- Consumes: seeded subjects (Task 2), `App\Support\Api\LocaleResolver` / `App\Support\Api\LocalizedFields` (existing, used identically to `FaqResource`).
- Produces: `GET /api/v1/enquiry-subjects` → `{"data": [{"key": string, "label": string}, ...]}`, consumed by the public frontend in Task 10.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\EnquirySubject;
use Database\Seeders\EnquirySubjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnquirySubjectsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_the_six_public_subjects_in_order_excluding_other(): void
    {
        $this->seed(EnquirySubjectSeeder::class);

        $response = $this->getJson('/api/v1/enquiry-subjects');

        $response->assertOk();
        $response->assertExactJson(['data' => [
            ['key' => 'buy', 'label' => 'Əsər almaq'],
            ['key' => 'general_contact', 'label' => 'Ümumi əlaqə'],
            ['key' => 'artist_submission', 'label' => 'Rəssam müraciəti'],
            ['key' => 'media', 'label' => 'Media sorğusu'],
            ['key' => 'exhibition_invitation', 'label' => 'Sərgi / dəvət'],
            ['key' => 'collaboration', 'label' => 'Əməkdaşlıq'],
        ]]);
    }

    public function test_returns_english_labels_when_locale_is_en(): void
    {
        $this->seed(EnquirySubjectSeeder::class);

        $response = $this->getJson('/api/v1/enquiry-subjects?locale=en');

        $response->assertOk();
        $response->assertJsonFragment(['key' => 'media', 'label' => 'Media enquiry']);
    }

    public function test_excludes_an_inactive_subject(): void
    {
        $this->seed(EnquirySubjectSeeder::class);
        EnquirySubject::query()->where('key', 'collaboration')->update(['is_active' => false]);

        $response = $this->getJson('/api/v1/enquiry-subjects');

        $response->assertOk();
        $keys = array_column($response->json('data'), 'key');
        $this->assertNotContains('collaboration', $keys);
        $this->assertCount(5, $keys);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=EnquirySubjectsApiTest`
Expected: FAIL — 404, route doesn't exist yet.

- [ ] **Step 3: Create the resource**

```php
<?php

namespace App\Http\Resources\Api;

use App\Support\Api\LocaleResolver;
use App\Support\Api\LocalizedFields;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EnquirySubjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = LocaleResolver::resolve($request);
        $fields = LocalizedFields::resolve($this->translations, $locale, ['name']);

        return [
            'key' => $this->key,
            'label' => $fields['name'],
        ];
    }
}
```

- [ ] **Step 4: Create the controller**

```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\EnquirySubjectResource;
use App\Models\EnquirySubject;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EnquirySubjectController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $subjects = EnquirySubject::query()
            ->where('is_active', true)
            ->where('key', '!=', 'other')
            ->with('translations')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return EnquirySubjectResource::collection($subjects);
    }
}
```

- [ ] **Step 5: Register the route**

In `routes/api.php`, add the import and the route inside the existing `v1` group, next to the `enquiries` POST route:

```php
use App\Http\Controllers\Api\V1\EnquirySubjectController;
// ...(existing imports)

Route::prefix('v1')->middleware('throttle:public-api')->group(function () {
    // ...(existing GET routes)...
    Route::get('enquiry-subjects', [EnquirySubjectController::class, 'index']);
    Route::post('enquiries', [EnquiryController::class, 'store'])->middleware('throttle:enquiry-submission');
});
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `php artisan test --filter=EnquirySubjectsApiTest`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add app/Http/Resources/Api/EnquirySubjectResource.php app/Http/Controllers/Api/V1/EnquirySubjectController.php routes/api.php tests/Feature/Api/EnquirySubjectsApiTest.php
git commit -m "feat(enquiries): add public GET /api/v1/enquiry-subjects endpoint"
```

---

### Task 5: Subject-aware notification email

**Files:**
- Modify: `app/Mail/NewEnquiryReceived.php`
- Modify: `app/Services/Api/EnquiryService.php` (eager-load addition only)
- Modify: `resources/views/emails/new-enquiry.blade.php`
- Test: `tests/Unit/Mail/NewEnquiryReceivedTest.php` (new)

**Interfaces:**
- Consumes: `Enquiry::$subject` relation with `translations` loaded (Task 2's seeded data shape).
- Produces: no new interface — this task only changes rendered content.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit\Mail;

use App\Mail\NewEnquiryReceived;
use App\Models\Enquiry;
use App\Models\EnquirySubject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NewEnquiryReceivedTest extends TestCase
{
    use RefreshDatabase;

    private function makeSubject(string $key, string $name): EnquirySubject
    {
        $subject = EnquirySubject::query()->create(['key' => $key, 'sort_order' => 0, 'is_active' => true]);
        $subject->translations()->create(['locale' => 'az', 'name' => $name]);

        return $subject;
    }

    public function test_buy_subject_keeps_the_artwork_subject_line_and_body(): void
    {
        $subject = $this->makeSubject('buy', 'Əsər almaq');
        $enquiry = Enquiry::query()->create([
            'enquiry_subject_id' => $subject->id,
            'inventory_code' => 'AN-000123',
            'submitted_at' => now(),
            'name' => 'Aysel',
            'contact' => 'aysel@example.com',
            'email' => 'aysel@example.com',
            'message' => 'Salam.',
            'status' => 'new',
        ]);
        $enquiry->load('artwork.translations', 'subject.translations');

        $mailable = new NewEnquiryReceived($enquiry);

        $mailable->assertHasSubject('Yeni sorğu: AN-000123');
        $mailable->assertSeeInHtml('İnventar kodu:');
    }

    public function test_non_buy_subject_uses_the_generic_subject_line_and_body(): void
    {
        $subject = $this->makeSubject('general_contact', 'Ümumi əlaqə');
        $enquiry = Enquiry::query()->create([
            'enquiry_subject_id' => $subject->id,
            'submitted_at' => now(),
            'name' => 'Aysel',
            'contact' => 'aysel@example.com',
            'email' => 'aysel@example.com',
            'message' => 'Salam.',
            'status' => 'new',
        ]);
        $enquiry->load('artwork.translations', 'subject.translations');

        $mailable = new NewEnquiryReceived($enquiry);

        $mailable->assertHasSubject('Yeni sorğu: Ümumi əlaqə');
        $mailable->assertDontSeeInHtml('İnventar kodu:');
        $mailable->assertSeeInHtml('Ümumi əlaqə');
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=NewEnquiryReceivedTest`
Expected: FAIL — subject line is still hardcoded to the inventory code (or errors, since `$enquiry->inventory_code` is null for the non-buy case).

- [ ] **Step 3: Update the mailable**

```php
<?php

namespace App\Mail;

use App\Enums\Locale;
use App\Models\Enquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewEnquiryReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Enquiry $enquiry) {}

    public function build(): self
    {
        $subjectLine = $this->enquiry->subject->key === 'buy'
            ? 'Yeni sorğu: '.$this->enquiry->inventory_code
            : 'Yeni sorğu: '.$this->enquiry->subject->translations->firstWhere('locale', Locale::Az)?->name;

        $mail = $this->subject($subjectLine)
            ->view('emails.new-enquiry')
            ->with([
                'enquiry' => $this->enquiry,
                'adminUrl' => rtrim(config('app.url'), '/').'/admin#enquiries',
            ]);

        if (filled($this->enquiry->email)) {
            $mail->replyTo($this->enquiry->email);
        }

        return $mail;
    }
}
```

- [ ] **Step 4: Update the Blade view**

```blade
<p>Yeni sorğu alındı.</p>

@if ($enquiry->subject->key === 'buy')
<p>
    <strong>Əsər:</strong> {{ $enquiry->artwork?->translations->firstWhere('locale', \App\Enums\Locale::Az)?->title ?? $enquiry->inventory_code }}<br>
    <strong>İnventar kodu:</strong> {{ $enquiry->inventory_code }}
</p>
@else
<p>
    <strong>Mövzu:</strong> {{ $enquiry->subject->translations->firstWhere('locale', \App\Enums\Locale::Az)?->name }}
</p>
@endif

<p>
    <strong>Ad:</strong> {{ $enquiry->name }}<br>
    <strong>E-poçt:</strong> {{ $enquiry->email }}<br>
    @if ($enquiry->phone)
    <strong>Telefon:</strong> {{ $enquiry->phone }}<br>
    @endif
    <strong>Tarix:</strong> {{ $enquiry->submitted_at?->format('Y-m-d H:i') }}
</p>

<p><strong>Mesaj:</strong><br>{{ $enquiry->message }}</p>

<p><a href="{{ $adminUrl }}">Admin paneldə bax</a></p>
```

- [ ] **Step 5: Update `EnquiryService::sendNotification`'s eager-load**

In `app/Services/Api/EnquiryService.php`, change the one line in `sendNotification()`:

```php
            Mail::to($recipient)->send(new NewEnquiryReceived($enquiry->load('artwork.translations', 'subject.translations')));
```

(Only `'subject.translations'` is added to the existing `load()` call — the mailable/view need it now that they branch on the subject's translated name.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test --filter=NewEnquiryReceivedTest`
Expected: PASS (2 tests).

Run: `php artisan test --filter=EnquiryServiceTest`
Expected: still PASS (regression check — the eager-load addition must not break the existing notification tests).

- [ ] **Step 7: Commit**

```bash
git add app/Mail/NewEnquiryReceived.php app/Services/Api/EnquiryService.php resources/views/emails/new-enquiry.blade.php tests/Unit/Mail/NewEnquiryReceivedTest.php
git commit -m "feat(enquiries): make the new-enquiry notification email subject-aware"
```

---

### Task 6: Admin API — subject filter

**Files:**
- Modify: `app/Http/Controllers/Admin/EnquiryController.php`
- Modify: `tests/Feature/Admin/EnquiryCrudTest.php`

**Interfaces:**
- Consumes: `Enquiry::subject()` relation (existing), seeded subject keys (Task 2).
- Produces: `GET /admin/enquiries?subject=<key>` query param, consumed by the admin frontend in Task 7.

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/Admin/EnquiryCrudTest.php` (the class already imports `EnquirySubject`):

```php
    public function test_subject_filter(): void
    {
        $other = EnquirySubject::query()->create(['key' => 'general_contact', 'sort_order' => 1, 'is_active' => true]);
        $other->translations()->create(['locale' => 'az', 'name' => 'Ümumi əlaqə']);

        $this->makeEnquiry();
        $this->makeEnquiry(['enquiry_subject_id' => $other->id, 'artwork_id' => null, 'inventory_code' => null]);

        $response = $this->actingAs($this->admin)->getJson('/admin/enquiries?subject=general_contact');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=EnquiryCrudTest::test_subject_filter`
Expected: FAIL — both enquiries are returned (filter not implemented).

- [ ] **Step 3: Add the filter**

In `app/Http/Controllers/Admin/EnquiryController.php@index`, add after the `artwork_id` filter block:

```php
        if ($request->filled('subject')) {
            $query->whereHas('subject', fn ($q) => $q->where('key', $request->query('subject')));
        }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --filter=EnquiryCrudTest`
Expected: PASS — the new test plus every pre-existing test in the file (regression check for `status`/`artwork_id`/date/search filters).

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/Admin/EnquiryController.php tests/Feature/Admin/EnquiryCrudTest.php
git commit -m "feat(admin): filter the enquiries list by subject"
```

---

### Task 7: Admin frontend — subject filter dropdown

**Files:**
- Modify: `resources/js/admin/screens/EnquiriesScreen.jsx`
- Modify: `resources/js/admin/__tests__/EnquiriesScreen.test.jsx`

**Interfaces:**
- Consumes: `GET /admin/enquiries?subject=<key>` (Task 6).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Write the failing test**

Add to `resources/js/admin/__tests__/EnquiriesScreen.test.jsx`:

```jsx
    it('requests the subject filter when changed', async () => {
        render(
            <ToastProvider>
                <EnquiriesScreen />
            </ToastProvider>
        );

        await screen.findByText('Aysel Məmmədova — aysel@example.com');

        await userEvent.selectOptions(screen.getByDisplayValue('Bütün mövzular'), 'media');

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('subject=media'), expect.anything());
        });
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- EnquiriesScreen`
Expected: FAIL — `getByDisplayValue('Bütün mövzular')` finds nothing (the select doesn't exist yet).

- [ ] **Step 3: Add the subject filter to the screen**

In `resources/js/admin/screens/EnquiriesScreen.jsx`:

```jsx
const STATUS_LABELS = { new: 'Yeni', read: 'Oxunub', replied: 'Cavablandırılıb', closed: 'Bağlanıb' };
const SUBJECT_LABELS = {
    buy: 'Əsər almaq',
    general_contact: 'Ümumi əlaqə',
    artist_submission: 'Rəssam müraciəti',
    media: 'Media sorğusu',
    exhibition_invitation: 'Sərgi / dəvət',
    collaboration: 'Əməkdaşlıq',
    other: 'Digər',
};

export default function EnquiriesScreen() {
    const [enquiries, setEnquiries] = useState(null);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [subject, setSubject] = useState('');
    const [search, setSearch] = useState('');
    const [openId, setOpenId] = useState(null);
    const [error, setError] = useState('');

    function load() {
        setError('');
        const params = new URLSearchParams({ page });
        if (status) params.set('status', status);
        if (subject) params.set('subject', subject);
        if (search) params.set('search', search);

        apiFetch('/enquiries?' + params.toString())
            .then((res) => {
                setEnquiries(res.data);
                setMeta(res.meta);
            })
            .catch(() => setError('Sorğuları yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, [page, status, subject, search]);
```

And in the filter bar JSX, right after the status `<select>`:

```jsx
                <select
                    value={subject}
                    onChange={(e) => {
                        setPage(1);
                        setSubject(e.target.value);
                    }}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                >
                    <option value="">Bütün mövzular</option>
                    {Object.entries(SUBJECT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- EnquiriesScreen`
Expected: PASS — the new test plus every pre-existing test in the file (regression check).

- [ ] **Step 5: Commit**

```bash
git add resources/js/admin/screens/EnquiriesScreen.jsx resources/js/admin/__tests__/EnquiriesScreen.test.jsx
git commit -m "feat(admin): add a subject filter to the enquiries list"
```

---

### Task 8: Admin frontend — fix the unconditional artwork row

**Files:**
- Modify: `resources/js/admin/screens/EnquiryDetailScreen.jsx`
- Modify: `resources/js/admin/__tests__/EnquiryDetailScreen.test.jsx`

**Interfaces:**
- Consumes: `EnquiryResource`'s existing nullable `artwork` field (no backend change needed — it's already nullable today).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Write the failing test**

Add to `resources/js/admin/__tests__/EnquiryDetailScreen.test.jsx`:

```jsx
    it('hides the artwork row when the enquiry has no artwork', async () => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/admin/enquiries/1')) {
                return Promise.resolve(
                    jsonResponse(200, { data: buildEnquiry({ artwork: null, inventory_code: null, subject: 'Ümumi əlaqə' }) })
                );
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        renderScreen();

        await screen.findByText('Bu əsər haqqında məlumat almaq istəyirəm.');
        expect(screen.queryByText('Əsər:')).not.toBeInTheDocument();
        expect(screen.getByText('Ümumi əlaqə')).toBeInTheDocument();
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- EnquiryDetailScreen`
Expected: FAIL — `screen.queryByText('Əsər:')` finds the always-rendered label.

- [ ] **Step 3: Make the artwork block conditional**

In `resources/js/admin/screens/EnquiryDetailScreen.jsx`, replace the artwork paragraph:

```jsx
                {enquiry.artwork && (
                    <p className="flex flex-wrap items-center gap-2">
                        <strong>Əsər:</strong> {enquiry.artwork.title} ({enquiry.artwork.inventory_code})
                        <button
                            type="button"
                            onClick={() => {
                                location.hash = 'artworks';
                            }}
                            className="text-sm text-neutral-500 hover:underline dark:text-neutral-400"
                        >
                            Əsərə keç
                        </button>
                    </p>
                )}
```

(This replaces the previous unconditional `<p>` block; the `{enquiry.subject && (...)}` "Mövzu:" block right above it is untouched — it's already conditional.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- EnquiryDetailScreen`
Expected: PASS — the new test plus every pre-existing test in the file. In particular, confirm `expect(screen.getByText('Yaz mənzərəsi (AN-000001)')).toBeInTheDocument()` (from `EnquiriesScreen.test.jsx`'s "opens the detail screen" test) still passes, since the artwork-present text output is unchanged.

- [ ] **Step 5: Commit**

```bash
git add resources/js/admin/screens/EnquiryDetailScreen.jsx resources/js/admin/__tests__/EnquiryDetailScreen.test.jsx
git commit -m "fix(admin): hide the artwork row on non-artwork enquiries"
```

---

### Task 9: Public frontend — `EnquiryForm` becomes subject-aware

**Files:**
- Modify: `resources/js/public/components/EnquiryForm.jsx`
- Modify: `resources/js/public/pages/ArtworkDetailPage.jsx`
- Modify: `resources/js/public/__tests__/EnquiryForm.test.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `<EnquiryForm subject={string} artworkCode?={string} />` — Task 11's Contact page renders this with no `artworkCode`.

- [ ] **Step 1: Update the existing tests to pass the new required prop**

In `resources/js/public/__tests__/EnquiryForm.test.jsx`, change every `<EnquiryForm artworkCode="AN-1" />` to `<EnquiryForm subject="buy" artworkCode="AN-1" />` (5 occurrences — one per `it()` block). Then add a new test:

```jsx
    it('includes subject and omits artwork_code when no artworkCode is provided', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));

        render(<LocaleProvider><EnquiryForm subject="general_contact" /></LocaleProvider>);

        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        await screen.findByText('Sorğunuz qeydə alındı.');

        const [, options] = global.fetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.subject).toBe('general_contact');
        expect(body).not.toHaveProperty('artwork_code');
    });
```

- [ ] **Step 2: Run the tests to verify the new one fails**

Run: `npm run test -- EnquiryForm`
Expected: the new test FAILs — `body.subject` is `undefined` (the component doesn't send `subject` yet). The 5 pre-existing tests should still pass unchanged since adding an extra prop doesn't affect their assertions.

- [ ] **Step 3: Update the component**

In `resources/js/public/components/EnquiryForm.jsx`, change the function signature and the submit call:

```jsx
export default function EnquiryForm({ subject, artworkCode }) {
    // ...(state declarations unchanged)

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus('submitting');
        setErrors({});
        setBanner('');

        try {
            await submitEnquiry({ ...fields, subject, artwork_code: artworkCode });
            setStatus('success');
            setBanner(t(locale, 'enquiryForm.success'));
        } catch (err) {
            // ...(unchanged)
        }
    }
    // ...(rest unchanged)
}
```

- [ ] **Step 4: Update the artwork-detail call site**

In `resources/js/public/pages/ArtworkDetailPage.jsx`, line 50:

```jsx
                    <EnquiryForm subject="buy" artworkCode={data.inventory_code} />
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test -- EnquiryForm`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add resources/js/public/components/EnquiryForm.jsx resources/js/public/pages/ArtworkDetailPage.jsx resources/js/public/__tests__/EnquiryForm.test.jsx
git commit -m "feat(public): make EnquiryForm subject-aware"
```

---

### Task 10: Public frontend — `getEnquirySubjects()` service call

**Files:**
- Modify: `resources/js/public/services/enquiries.js`
- Modify: `resources/js/public/__tests__/enquiries-service.test.jsx`

**Interfaces:**
- Consumes: `GET /api/v1/enquiry-subjects` (Task 4), `publicApiFetch(path, params)` (existing, in `resources/js/public/lib/api.js`).
- Produces: `getEnquirySubjects(): Promise<{data: {key: string, label: string}[]}>` — consumed by the Contact page in Task 11.

- [ ] **Step 1: Write the failing test**

Add to `resources/js/public/__tests__/enquiries-service.test.jsx`:

```jsx
import { submitEnquiry, getEnquirySubjects } from '../services/enquiries.js';
// (keep the existing import of PublicApiError)

describe('getEnquirySubjects', () => {
    it('fetches the public subject list', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ key: 'buy', label: 'Əsər almaq' }] }));

        const result = await getEnquirySubjects();

        expect(global.fetch).toHaveBeenCalledWith('/api/v1/enquiry-subjects', expect.objectContaining({ headers: expect.anything() }));
        expect(result).toEqual({ data: [{ key: 'buy', label: 'Əsər almaq' }] });
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- enquiries-service`
Expected: FAIL — `getEnquirySubjects is not a function`.

- [ ] **Step 3: Add the service function**

```js
import { publicApiFetch, publicApiPost } from '../lib/api.js';

export function submitEnquiry(payload) {
    return publicApiPost('/enquiries', payload);
}

export function getEnquirySubjects() {
    return publicApiFetch('/enquiry-subjects');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- enquiries-service`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add resources/js/public/services/enquiries.js resources/js/public/__tests__/enquiries-service.test.jsx
git commit -m "feat(public): add getEnquirySubjects service call"
```

---

### Task 11: Public frontend — unified Contact page

**Files:**
- Create: `resources/js/public/pages/ContactPage.jsx`
- Modify: `resources/js/public/App.jsx`
- Modify: `resources/js/public/lib/useRouter.js`
- Modify: `resources/js/public/i18n/dictionary.js`
- Test: `resources/js/public/__tests__/ContactPage.test.jsx` (new)

**Interfaces:**
- Consumes: `getEnquirySubjects()` (Task 10), `<EnquiryForm subject artworkCode?>` (Task 9).
- Produces: the `/contact` route.

Note: this task only wires the page and route. Adding a "Contact" link to the site's navigation menu is not part of the approved spec — flag it as a follow-up decision rather than editing `SiteShell.jsx` here.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ContactPage from '../pages/ContactPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const SUBJECTS = [
    { key: 'buy', label: 'Əsər almaq' },
    { key: 'general_contact', label: 'Ümumi əlaqə' },
    { key: 'artist_submission', label: 'Rəssam müraciəti' },
    { key: 'media', label: 'Media sorğusu' },
    { key: 'exhibition_invitation', label: 'Sərgi / dəvət' },
    { key: 'collaboration', label: 'Əməkdaşlıq' },
];

describe('ContactPage', () => {
    it('renders all six subjects and submits the selected one without an artwork_code', async () => {
        global.fetch = vi.fn((url) => {
            if (url.startsWith('/api/v1/enquiry-subjects')) {
                return Promise.resolve(jsonResponse(200, { data: SUBJECTS }));
            }
            return Promise.resolve(jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' }));
        });

        render(<LocaleProvider><ContactPage /></LocaleProvider>);

        await screen.findByText('Əlaqə');
        SUBJECTS.forEach((item) => {
            expect(screen.getByRole('option', { name: item.label })).toBeInTheDocument();
        });

        await userEvent.selectOptions(screen.getByLabelText('Mövzu'), 'media');
        await userEvent.type(screen.getByLabelText('Ad'), 'Aysel');
        await userEvent.type(screen.getByLabelText('E-poçt'), 'aysel@example.com');
        await userEvent.type(screen.getByLabelText('Mesaj'), 'Salam');
        await userEvent.click(screen.getByRole('button', { name: 'Göndər' }));

        await screen.findByText('Sorğunuz qeydə alındı.');

        const submitCall = global.fetch.mock.calls.find(([url]) => url === '/api/v1/enquiries');
        const body = JSON.parse(submitCall[1].body);
        expect(body.subject).toBe('media');
        expect(body).not.toHaveProperty('artwork_code');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- ContactPage`
Expected: FAIL — the module `../pages/ContactPage.jsx` doesn't exist yet.

- [ ] **Step 3: Add the `contact` dictionary entries**

In `resources/js/public/i18n/dictionary.js`, add to the `az` block (near `enquiryForm`):

```js
        contact: {
            title: 'Əlaqə',
            subjectLabel: 'Mövzu',
        },
```

and to the `en` block:

```js
        contact: {
            title: 'Contact',
            subjectLabel: 'Subject',
        },
```

- [ ] **Step 4: Create `ContactPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { getEnquirySubjects } from '../services/enquiries.js';
import EnquiryForm from '../components/EnquiryForm.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function ContactPage() {
    const { locale } = useLocale();
    const [subjects, setSubjects] = useState(null);
    const [error, setError] = useState(null);
    const [subject, setSubject] = useState('');

    usePageMeta({ title: `${t(locale, 'contact.title')} — ArtNiyyətli` });

    useEffect(() => {
        getEnquirySubjects()
            .then((res) => {
                setSubjects(res.data);
                setSubject(res.data[0]?.key ?? '');
            })
            .catch((err) => setError(err));
    }, []);

    if (error) return <ErrorState error={error} />;
    if (subjects === null) return <LoadingState />;

    return (
        <div className="mx-auto max-w-xl px-6 py-8">
            <h1 className="text-2xl font-semibold">{t(locale, 'contact.title')}</h1>

            <label className="mt-4 block text-sm">
                {t(locale, 'contact.subjectLabel')}
                <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
                >
                    {subjects.map((item) => (
                        <option key={item.key} value={item.key}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </label>

            <div className="mt-6">
                <EnquiryForm subject={subject} />
            </div>
        </div>
    );
}
```

- [ ] **Step 5: Register the route**

In `resources/js/public/lib/useRouter.js`, insert a new entry **before** the `{ pattern: '/:slug', page: 'static-page' }` catch-all (order matters — the array is matched top-to-bottom):

```js
const ROUTES = [
    { pattern: '/', page: 'home' },
    { pattern: '/artworks', page: 'catalogue' },
    { pattern: '/artworks/:code', page: 'artwork-detail' },
    { pattern: '/artists', page: 'artists' },
    { pattern: '/artists/:slug', page: 'artist-detail' },
    { pattern: '/exhibitions', page: 'exhibitions' },
    { pattern: '/exhibitions/:slug', page: 'exhibition-detail' },
    { pattern: '/articles', page: 'articles' },
    { pattern: '/articles/:slug', page: 'article-detail' },
    { pattern: '/contact', page: 'contact' },
    { pattern: '/:slug', page: 'static-page' },
];
```

In `resources/js/public/App.jsx`, import the page and add it to the `PAGES` map:

```jsx
import ContactPage from './pages/ContactPage.jsx';
// ...(existing imports)

const PAGES = {
    home: HomePage,
    catalogue: CataloguePage,
    'artwork-detail': ArtworkDetailPage,
    artists: ArtistsPage,
    'artist-detail': ArtistDetailPage,
    exhibitions: ExhibitionsPage,
    'exhibition-detail': ExhibitionDetailPage,
    articles: ArticlesPage,
    'article-detail': ArticleDetailPage,
    contact: ContactPage,
    'static-page': StaticPage,
    'not-found': NotFoundPage,
};
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test -- ContactPage`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add resources/js/public/pages/ContactPage.jsx resources/js/public/App.jsx resources/js/public/lib/useRouter.js resources/js/public/i18n/dictionary.js resources/js/public/__tests__/ContactPage.test.jsx
git commit -m "feat(public): add a unified Contact page with a subject selector"
```

---

### Task 12: Full regression and definition-of-done review

**Files:** none (verification only).

**Interfaces:** none — this task only runs and reads output.

- [ ] **Step 1: Run the full backend suite**

Run (inside the app container): `php artisan test`
Expected: 100% pass, including every test added/modified in Tasks 1–6, and every pre-existing test untouched by this plan (in particular the full `EnquiryApiTest`, `EnquiryServiceTest`, `EnquiryCrudTest`, `EnquiryReplyTest`, `EnquirySchemaTest` files).

- [ ] **Step 2: Run Pint**

Run: `./vendor/bin/pint --test`
Expected: all files pass with no style violations. If any file this plan touched is flagged, run `./vendor/bin/pint` (no `--test`) on just that file, review the diff, then re-run `--test`.

- [ ] **Step 3: Run the full frontend suite**

Run: `npm run test`
Expected: 100% pass, including every test added/modified in Tasks 7–11, and every pre-existing frontend test untouched by this plan.

- [ ] **Step 4: Manually reseed a local/dev database (optional, if one is running)**

Run: `php artisan db:seed --class=Database\\Seeders\\EnquirySubjectSeeder`
Verify: `EnquirySubject::count()` is 7 and the four new keys exist, without duplicating or altering the existing `buy`/`other` rows' `key` values.

- [ ] **Step 5: Walk the spec's Definition of Done**

Go through `docs/superpowers/specs/2026-09-18-subject-driven-enquiries-design.md`'s "Definition of done" section line by line and confirm each item against the work done in Tasks 1–11. Do not check an item off from memory — re-read the relevant task's diff or re-run the relevant test.

- [ ] **Step 6: Confirm no out-of-scope changes**

Run: `git status` and `git diff --stat` against the state before Task 1, and confirm:
- No files under `work-files/` were touched.
- No production configuration (`.env`, `config/*.php` outside what this plan explicitly listed — none did) was touched.
- No subject-specific fields, file-upload code, or per-subject notification routing were introduced anywhere (none of the 12 tasks above should have added any).

- [ ] **Step 7: Commit (only if Steps 1–6 required any fixes)**

If every check passed with no additional changes, there is nothing to commit for this task. If a fix was needed, commit it with a message describing exactly what regression it addressed.
