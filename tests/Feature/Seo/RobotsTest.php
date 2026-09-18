<?php

namespace Tests\Feature\Seo;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RobotsTest extends TestCase
{
    use RefreshDatabase;

    public function test_robots_txt_allows_public_paths_and_disallows_admin_and_api(): void
    {
        $response = $this->get('/robots.txt');

        $response->assertOk();
        $response->assertHeader('content-type', 'text/plain; charset=UTF-8');
        $response->assertSee('User-agent: *', false);
        $response->assertSee('Disallow: /admin', false);
        $response->assertSee('Disallow: /api', false);
        $response->assertSee('Allow: /', false);
    }

    public function test_robots_txt_references_the_configured_app_url_sitemap(): void
    {
        config(['app.url' => 'https://artniyyetli.az']);

        $response = $this->get('/robots.txt');

        $response->assertSee('Sitemap: https://artniyyetli.az/sitemap.xml', false);
    }

    public function test_robots_txt_never_hardcodes_localhost(): void
    {
        config(['app.url' => 'https://artniyyetli.az']);

        $response = $this->get('/robots.txt');

        $response->assertDontSee('localhost', false);
    }
}
