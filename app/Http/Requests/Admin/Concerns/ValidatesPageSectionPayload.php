<?php

namespace App\Http\Requests\Admin\Concerns;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

trait ValidatesPageSectionPayload
{
    protected function rejectDuplicateTranslationLocales(Validator $validator): void
    {
        $locales = collect($this->input('translations', []))->pluck('locale');

        if ($locales->count() !== $locales->unique()->count()) {
            $validator->errors()->add('translations', 'Each locale may only appear once.');
        }
    }

    protected function rejectDuplicateKeyWithinPage(Validator $validator, int $pageId): void
    {
        $key = $this->input('key');

        if (empty($key)) {
            return;
        }

        $currentSection = $this->route('section');

        $exists = Rule::unique('page_sections', 'key')
            ->where(fn ($query) => $query->where('page_id', $pageId))
            ->when($currentSection, fn ($rule) => $rule->ignore($currentSection->id));

        $validatorForKey = validator(['key' => $key], ['key' => [$exists]]);

        if ($validatorForKey->fails()) {
            $validator->errors()->add('key', 'This key is already used by another section on this page.');
        }
    }

    protected function rejectUnsafeRichText(Validator $validator): void
    {
        $patterns = ['/<script/i', '/<iframe/i', '/javascript:/i', '/on\w+\s*=/i'];

        foreach ($this->input('translations', []) as $index => $translation) {
            $value = $translation['body'] ?? null;

            if (! is_string($value)) {
                continue;
            }

            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $value) === 1) {
                    $validator->errors()->add(
                        "translations.{$index}.body",
                        'This field contains disallowed content (scripts, iframes, or event-handler attributes are not permitted).'
                    );

                    break;
                }
            }
        }
    }
}
