# Subject-Driven Enquiry System — Design Spec

**Status:** Approved. **Date:** 2026-09-18

## Exact scope

**In scope:**
- One additive, nullable `meta` JSON column on `enquiries` (structural placeholder only — not populated in this phase).
- Six public subjects end-to-end: `buy`, `general_contact`, `artist_submission`, `media`, `exhibition_invitation`, `collaboration`. `other` remains historical/admin-only — never publicly selectable.
- Extending `StoreEnquiryRequest` / `EnquiryService` / `EnquiryController` (public) so all 6 public subjects can be submitted through the existing `POST /api/v1/enquiries`.
- New `GET /api/v1/enquiry-subjects` (public, read-only, excludes `other`).
- Subject-aware `NewEnquiryReceived` mail content.
- Admin subject filter on the enquiries list; fixing the admin detail view's unconditional artwork block.
- One unified public "Contact" page with a subject selector, reusing the existing form component; the artwork-detail enquiry form keeps working unchanged, using `subject=buy`.

**Explicitly out of scope:**
- No subject-specific fields (portfolio URL, event date, organization name, etc.) — `meta` stays `null` for every enquiry created in this phase.
- No public file/portfolio upload.
- No per-subject notification routing — every subject still notifies the single `contact_email` site setting, exactly as today.
- No changes to `enquiry_replies`, the admin reply flow, rate limiter config, honeypot mechanism, or admin auth boundaries.
- `other` is not selectable via the API or the public picker — it exists only for pre-existing historical rows.

## Database changes

One migration:

```
enquiries
  + meta  JSON  NULLABLE  (after internal_note)
```

No other schema changes. `enquiry_subjects`, `enquiry_subject_translations`, `enquiry_replies`, and the existing `artwork_id`/`inventory_code` nullability already support this design.

## Subject/translation seed data

`buy` and `other` rows are untouched in key/meaning. `artist_submission` already exists; its `sort_order` is corrected so the public list renders in the specified order. New rows: `general_contact`, `media`, `exhibition_invitation`, `collaboration`.

| key | sort_order | az | en |
|---|---|---|---|
| `buy` | 0 | *(unchanged)* | *(unchanged)* |
| `general_contact` | 1 | Ümumi əlaqə | General contact |
| `artist_submission` | 2 | *(unchanged label)* | *(unchanged label)* |
| `media` | 3 | Media sorğusu | Media enquiry |
| `exhibition_invitation` | 4 | Sərgi / dəvət | Exhibition / invitation |
| `collaboration` | 5 | Əməkdaşlıq | Collaboration |
| `other` | 2 *(unchanged; excluded from the public list by key filter, not by sort_order)* | *(unchanged)* | *(unchanged)* |

`GET /api/v1/enquiry-subjects` sorts by `sort_order` and excludes `key = 'other'`, yielding: `buy, general_contact, artist_submission, media, exhibition_invitation, collaboration`.

## API contract

**`POST /api/v1/enquiries`** (existing endpoint, extended). Request body:

```json
{
  "name": "string, required",
  "email": "string, required, email",
  "phone": "string, optional",
  "message": "string, required",
  "subject": "string, required — one of: buy | general_contact | artist_submission | media | exhibition_invitation | collaboration",
  "artwork_code": "string — required if subject=buy, prohibited otherwise",
  "website": "string, optional — honeypot, unchanged"
}
```

Response: unchanged — `{"message": "Sorğunuz qeydə alındı."}`, HTTP 201.

**`GET /api/v1/enquiry-subjects`** (new). Public, no auth, sits in the existing `v1` group under `throttle:public-api`.

```json
[
  { "key": "buy", "label": "Əsər almaq" },
  { "key": "general_contact", "label": "Ümumi əlaqə" },
  { "key": "artist_submission", "label": "Rəssam müraciəti" },
  { "key": "media", "label": "Media sorğusu" },
  { "key": "exhibition_invitation", "label": "Sərgi / dəvət" },
  { "key": "collaboration", "label": "Əməkdaşlıq" }
]
```

## Validation rules

`StoreEnquiryRequest::ALLOWED_FIELDS` becomes `['name', 'email', 'phone', 'message', 'subject', 'artwork_code', 'website']`. `meta` is deliberately excluded — any attempt to send it is rejected as an unexpected field (422).

| Field | Rule |
|---|---|
| `name` | `required, string, max:255` (unchanged) |
| `email` | `required, email, max:255` (unchanged) |
| `phone` | `nullable, string, max:30` (unchanged) |
| `message` | `required, string, max:5000` (unchanged) |
| `subject` | `required, string, Rule::in(['buy','general_contact','artist_submission','media','exhibition_invitation','collaboration'])` — `other` is never valid input |
| `artwork_code` | `required_if:subject,buy`, `prohibited_unless:subject,buy`, `max:100`, existing `Rule::exists('artworks','inventory_code')->where(active, not deleted)` |
| `website` | `sometimes, nullable, string, max:255` (unchanged, honeypot) |

The existing sold-artwork eligibility check keeps running exactly as today for `subject=buy`.

## Service behavior

`EnquiryController@store` (public) resolves `$artwork` only when `subject === 'buy'`; passes a nullable `Artwork` into the service.

`EnquiryService::createFromPublicSubmission(?Artwork $artwork, array $data, ?string $ip, ?string $userAgent): Enquiry`:
- Resolves the subject key from `$data['subject'] ?? 'buy'` (the `?? 'buy'` default preserves the service's pre-existing direct-call contract used by `EnquiryServiceTest::test_creates_enquiry_and_resolves_buy_subject_without_seeder`, which calls the service without a `subject` key and without the seeder having run).
- Keeps `EnquirySubject::firstOrCreate(['key' => $key], ['sort_order' => 0, 'is_active' => true])` (same mechanism as today) rather than switching to a strict lookup, so that contract keeps holding.
- `Enquiry::create([... 'artwork_id' => $artwork?->id, 'inventory_code' => $artwork?->inventory_code, 'meta' => null, ...])`.
- `sendNotification()` is unchanged: same single-recipient resolution, for every subject.

## Email behavior/templates

`NewEnquiryReceived::build()`: subject line branches — `buy` keeps `'Yeni sorğu: '.$enquiry->inventory_code`; every other subject (including `media`) uses a generic line built from the subject's translated label.

`resources/views/emails/new-enquiry.blade.php`: the "Əsər / İnventar kodu" block is wrapped in `@if ($enquiry->subject->key === 'buy')`; the `@else` branch shows the subject's translated label instead.

`EnquiryReplyMail` and its view: unchanged.

## Admin changes

- `EnquiryController@index` (admin): new optional `subject` query param — filters via `whereHas('subject', fn ($q) => $q->where('key', $request->query('subject')))`. Accepts any key, including `other`.
- `EnquiryResource`, `@show`, `@update`, `@reply`: unchanged. `meta` stays unpopulated and unexposed this phase.
- `EnquiriesScreen.jsx`: subject filter dropdown listing all 7 keys (6 public + `other`), hardcoded labels matching the existing `STATUS_LABELS` pattern.
- `EnquiryDetailScreen.jsx`: the "Əsər:" row becomes conditional on `enquiry.artwork` being present (pre-existing display bug, now user-visible for the first time since non-`buy` enquiries will start arriving).

## Public frontend changes

- `EnquiryForm.jsx`: add a required `subject` prop, included verbatim in the POST payload. No new input fields.
- The artwork-detail page's `<EnquiryForm artworkCode={...} />` call site passes `subject="buy"` explicitly — no visible/behavioral change for end users.
- `services/enquiries.js`: add `getEnquirySubjects()`.
- New unified Contact page: subject selector (6 entries) driving the shared `EnquiryForm`, no `artworkCode`.

## Security considerations

- Rate limiting (`throttle:enquiry-submission` 5/hr/IP, `throttle:public-api` 60/min/IP) and the honeypot (`website`) are unchanged and apply uniformly across all subjects.
- `StoreEnquiryRequest`'s strict field allowlist is extended only with `subject`; `meta` is excluded.
- `Enquiry`'s `#[Fillable]` gains `meta`, but the service always writes `null` for it — no new injection surface.
- `artwork_code` is `prohibited_unless:subject,buy`, closing off cross-subject artwork attachment and sold-artwork-check bypass.
- `subject` is validated against a fixed allowlist excluding `other`.
- No change to the public/admin authorization boundary.

## Tests

Backend: `EnquiryApiTest` (all 6 subjects: valid submission, required-field 422s, artwork_code prohibited for non-`buy`, `subject=other`/unknown → 422, `meta` in payload → 422); new `EnquirySubjectsApiTest`; `EnquiryServiceTest` (recipient/mail-branch/`meta=null` per subject); `EnquiryCrudTest` (subject filter incl. `other`); `EnquiryReplyTest` (regression); seeder idempotency test extended.

Frontend: `EnquiryForm.test.jsx` (subject prop threaded through); new Contact-page test (6 options, correct payload); `EnquiryDetailScreen.test.jsx` (artwork row hidden/shown); `EnquiriesScreen.test.jsx` (subject filter query param).

Full regression: entire `php artisan test` suite + Pint + full frontend test suite, zero regressions.

## Backward compatibility

- `subject=buy` behavior (validation, sold-artwork rule, notification, admin reply) is unchanged — only the payload now makes the subject explicit instead of implicit.
- Historical `other` enquiries remain fully readable/filterable in the admin panel.
- `contact` column, `POST /enquiries` response shape, rate limits, honeypot, and admin auth are all untouched.
- `meta` is additive and nullable — no existing row or code path is affected.

## Definition of done

- Migration adds the nullable `meta` column cleanly on a fresh and an existing DB.
- Seeder creates the 4 new subject rows + AZ/EN translations idempotently, with corrected `sort_order`; `buy`/`other` untouched in key/meaning.
- `POST /api/v1/enquiries` accepts all 6 public subjects per the rules above; `buy` behavior is unchanged from before this work.
- `GET /api/v1/enquiry-subjects` returns the correct, correctly localized 6-item list, in the specified order.
- Admin can filter by subject (including `other`); the detail view renders correctly for both artwork and non-artwork enquiries.
- Notification email renders correctly, with no broken/empty blocks, for every subject; recipient unchanged.
- A unified public Contact page can submit any of the 6 subjects; the artwork-detail form is functionally unchanged for end users.
- All listed tests exist and pass; full backend suite + Pint pass with zero regressions.
- No production configuration changed, `work-files/` untouched, no credentials exposed.
