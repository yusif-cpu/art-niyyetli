<?php

namespace Tests\Feature\Schema;

use App\Models\SiteSetting;
use App\Models\SocialLink;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteSettingSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_site_setting_key_is_unique(): void
    {
        SiteSetting::create(['key' => 'contact_email', 'value' => 'gallery@example.com', 'type' => 'email']);

        $this->expectException(QueryException::class);
        SiteSetting::create(['key' => 'contact_email', 'value' => 'other@example.com', 'type' => 'email']);
    }

    public function test_social_link_can_be_created(): void
    {
        $link = SocialLink::create(['platform' => 'instagram', 'url' => 'https://instagram.com/artniyyetli']);

        $this->assertTrue($link->fresh()->is_active);
    }
}
