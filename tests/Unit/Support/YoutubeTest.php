<?php

namespace Tests\Unit\Support;

use App\Support\Youtube;
use Tests\TestCase;

class YoutubeTest extends TestCase
{
    public function test_extracts_id_from_standard_watch_url(): void
    {
        $this->assertSame('dQw4w9WgXcQ', Youtube::extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    }

    public function test_extracts_id_from_watch_url_with_extra_query_params(): void
    {
        $this->assertSame('dQw4w9WgXcQ', Youtube::extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123'));
    }

    public function test_extracts_id_from_bare_domain_watch_url(): void
    {
        $this->assertSame('dQw4w9WgXcQ', Youtube::extractVideoId('youtube.com/watch?v=dQw4w9WgXcQ'));
    }

    public function test_extracts_id_from_mobile_subdomain(): void
    {
        $this->assertSame('dQw4w9WgXcQ', Youtube::extractVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ'));
    }

    public function test_extracts_id_from_short_link(): void
    {
        $this->assertSame('dQw4w9WgXcQ', Youtube::extractVideoId('https://youtu.be/dQw4w9WgXcQ'));
    }

    public function test_extracts_id_from_short_link_with_query_string(): void
    {
        $this->assertSame('dQw4w9WgXcQ', Youtube::extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=10'));
    }

    public function test_extracts_id_from_embed_url(): void
    {
        $this->assertSame('dQw4w9WgXcQ', Youtube::extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'));
    }

    public function test_extracts_id_from_shorts_url(): void
    {
        $this->assertSame('dQw4w9WgXcQ', Youtube::extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'));
    }

    public function test_rejects_non_youtube_host(): void
    {
        $this->assertNull(Youtube::extractVideoId('https://vimeo.com/watch?v=dQw4w9WgXcQ'));
    }

    public function test_rejects_javascript_scheme(): void
    {
        $this->assertNull(Youtube::extractVideoId('javascript:alert(1)'));
    }

    public function test_rejects_data_scheme(): void
    {
        $this->assertNull(Youtube::extractVideoId('data:text/html,<script>alert(1)</script>'));
    }

    public function test_rejects_malformed_video_id(): void
    {
        $this->assertNull(Youtube::extractVideoId('https://www.youtube.com/watch?v=short'));
    }

    public function test_rejects_url_without_a_video_id(): void
    {
        $this->assertNull(Youtube::extractVideoId('https://www.youtube.com/'));
    }

    public function test_rejects_empty_string(): void
    {
        $this->assertNull(Youtube::extractVideoId(''));
    }

    public function test_rejects_html_injected_via_the_video_id_position(): void
    {
        $this->assertNull(Youtube::extractVideoId('https://www.youtube.com/embed/<script>alert(1)</script>'));
    }

    public function test_watch_url_is_built_from_the_id(): void
    {
        $this->assertSame('https://www.youtube.com/watch?v=dQw4w9WgXcQ', Youtube::watchUrl('dQw4w9WgXcQ'));
    }

    public function test_embed_url_uses_the_privacy_enhanced_domain(): void
    {
        $this->assertSame('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', Youtube::embedUrl('dQw4w9WgXcQ'));
    }
}
