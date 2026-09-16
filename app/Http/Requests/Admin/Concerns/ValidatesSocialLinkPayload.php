<?php

namespace App\Http\Requests\Admin\Concerns;

use Illuminate\Validation\Validator;

trait ValidatesSocialLinkPayload
{
    protected function rejectDangerousUrlScheme(Validator $validator): void
    {
        $url = $this->input('url');

        if (! is_string($url) || $url === '') {
            return;
        }

        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        if (! in_array($scheme, ['http', 'https'], true)) {
            $validator->errors()->add('url', 'Only http/https links are allowed.');
        }
    }
}
