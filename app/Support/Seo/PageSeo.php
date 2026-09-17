<?php

namespace App\Support\Seo;

final class PageSeo
{
    public function __construct(
        public readonly string $title,
        public readonly ?string $description,
        public readonly string $canonicalUrl,
        public readonly bool $index,
        public readonly bool $follow,
        public readonly string $ogType,
        public readonly ?string $ogImageUrl,
        public readonly string $ogLocale,
        public readonly ?array $jsonLd,
        public readonly int $httpStatus = 200,
    ) {}

    public function robotsContent(): string
    {
        return ($this->index ? 'index' : 'noindex').', '.($this->follow ? 'follow' : 'nofollow');
    }
}
