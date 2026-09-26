<?php

namespace App\Http\Requests\Admin\Concerns;

use App\Models\Page;
use App\Models\PageSection;
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

    /**
     * A key is lower-case letters/digits joined by single `-` or `_`. Only a key that is being created or changed is
     * checked: an existing section keeps a legacy key it already has (saving other fields never fails because of it).
     */
    protected function rejectInvalidKeyFormat(Validator $validator): void
    {
        $key = $this->input('key');

        if (! is_string($key) || $key === '' || $key === $this->route('section')?->key) {
            return;
        }

        if (preg_match(PageSection::KEY_PATTERN, $key) !== 1) {
            $validator->errors()->add('key', 'The key may only contain lower-case letters and numbers, with single hyphens or underscores between them.');
        }
    }

    /**
     * On the home page the hero, steps and cta sections are the frontend's contract: renaming one would silently
     * blank that part of the site, so their keys are locked (every other field stays editable).
     */
    protected function rejectRenamingContractKey(Validator $validator): void
    {
        $section = $this->route('section');
        $key = $this->input('key');

        if (! $section || ! is_string($key) || $key === $section->key) {
            return;
        }

        $page = Page::query()->find($section->page_id);

        if ($page && in_array($section->key, PageSection::contractKeysFor($page->type), true)) {
            $validator->errors()->add('key', "The \"{$section->key}\" section is part of the homepage layout and its key cannot be changed.");
        }
    }
}
