<?php

namespace App\Http\Requests\Admin\Concerns;

use Illuminate\Validation\Validator;

trait ValidatesFaqPayload
{
    protected function rejectDuplicateTranslationLocales(Validator $validator): void
    {
        $locales = collect($this->input('translations', []))->pluck('locale');

        if ($locales->count() !== $locales->unique()->count()) {
            $validator->errors()->add('translations', 'Each locale may only appear once.');
        }
    }

    protected function rejectUnsafeRichText(Validator $validator): void
    {
        $patterns = ['/<script/i', '/<iframe/i', '/javascript:/i', '/on\w+\s*=/i'];

        foreach ($this->input('translations', []) as $index => $translation) {
            $value = $translation['answer'] ?? null;

            if (! is_string($value)) {
                continue;
            }

            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $value) === 1) {
                    $validator->errors()->add(
                        "translations.{$index}.answer",
                        'This field contains disallowed content (scripts, iframes, or event-handler attributes are not permitted).'
                    );

                    break;
                }
            }
        }
    }
}
