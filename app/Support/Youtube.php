<?php

namespace App\Support;

class Youtube
{
    private const ALLOWED_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];

    public static function extractVideoId(string $url): ?string
    {
        $url = trim($url);

        if ($url === '') {
            return null;
        }

        if (! preg_match('#^https?://#i', $url)) {
            $url = 'https://'.$url;
        }

        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        if (! in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        if (! in_array($host, self::ALLOWED_HOSTS, true)) {
            return null;
        }

        $path = (string) parse_url($url, PHP_URL_PATH);
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

        $candidate = match (true) {
            $host === 'youtu.be' => ltrim($path, '/'),
            str_starts_with($path, '/watch') => $query['v'] ?? null,
            str_starts_with($path, '/embed/') => substr($path, strlen('/embed/')),
            str_starts_with($path, '/shorts/') => substr($path, strlen('/shorts/')),
            default => null,
        };

        if (! is_string($candidate) || $candidate === '') {
            return null;
        }

        $candidate = explode('/', $candidate)[0];

        return preg_match('/^[A-Za-z0-9_-]{11}$/', $candidate) === 1 ? $candidate : null;
    }

    public static function watchUrl(string $videoId): string
    {
        return 'https://www.youtube.com/watch?v='.$videoId;
    }

    public static function embedUrl(string $videoId): string
    {
        return 'https://www.youtube-nocookie.com/embed/'.$videoId;
    }
}
