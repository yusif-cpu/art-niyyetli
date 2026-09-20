<?php

namespace App\Services\Admin;

use App\Enums\LogoDisplayMode;
use App\Models\Media;
use App\Models\SiteSetting;
use App\Support\Cache\PublicContentCache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SiteSettingService
{
    public const ALLOWED_KEYS = [
        'contact_email', 'phone', 'address', 'opening_hours', 'footer_text', 'whatsapp_number',
        'brand_text', 'logo_media_id', 'logo_display_mode',
    ];

    public function __construct(private PublicContentCache $cache) {}

    /**
     * The settings as the public site sees them. Cached (plain scalars only) and invalidated by the content version,
     * which every admin write bumps; update() bumps it itself before re-reading, so the response to a save is fresh.
     */
    public function all(): array
    {
        return $this->cache->remember('site-settings', (int) config('public_cache.ttl.site_settings'), fn () => $this->load());
    }

    private function load(): array
    {
        $rows = SiteSetting::query()->whereIn('key', self::ALLOWED_KEYS)->pluck('value', 'key');

        $settings = array_merge(array_fill_keys(self::ALLOWED_KEYS, null), $rows->all());

        // Unlike the contact fields above (which have no sensible default and
        // legitimately stay null), the header/footer brand mark must always
        // render something coherent, so these two fall back to sane defaults
        // rather than leaking "null"/blank into the public site.
        $settings['brand_text'] = $settings['brand_text'] ?: 'ArtNiyyətli';
        $settings['logo_display_mode'] = $settings['logo_display_mode'] ?: LogoDisplayMode::LogoText->value;

        // logo_url is derived, not stored: it is not in ALLOWED_KEYS and is
        // never written by update(); it is resolved from logo_media_id whenever
        // the settings are (re)built, so a replaced/removed media file is
        // reflected as soon as the public content cache is invalidated (every
        // admin write does that) or its entry expires.
        $settings['logo_url'] = $this->resolveLogoUrl($settings['logo_media_id']);

        return $settings;
    }

    public function update(array $data): array
    {
        // Belt-and-suspenders: even if a caller bypassed the Form Request layer,
        // only the allowlisted keys can ever be written through this method.
        $allowed = array_intersect_key($data, array_flip(self::ALLOWED_KEYS));

        // Stored as bare digits, the form wa.me links need, whatever punctuation the admin typed.
        if (array_key_exists('whatsapp_number', $allowed)) {
            $allowed['whatsapp_number'] = self::whatsappDigits($allowed['whatsapp_number']);
        }

        DB::transaction(function () use ($allowed) {
            foreach ($allowed as $key => $value) {
                SiteSetting::query()->updateOrCreate(
                    ['key' => $key],
                    ['value' => $value ?? '', 'type' => 'string']
                );
            }
        });

        // Before re-reading, not only in the admin middleware after the response: the settings returned to the
        // admin who just saved must never come from the cache entry that this write made stale.
        $this->cache->bump();

        return $this->all();
    }

    /**
     * A phone number reduced to its digits ("+994 50 123-45-67" => "994501234567"): the only form that is
     * safe to put into a https://wa.me/ link. Empty when there is nothing usable.
     */
    public static function whatsappDigits(?string $value): string
    {
        return preg_replace('/\D+/', '', (string) $value);
    }

    private function resolveLogoUrl(?string $mediaId): ?string
    {
        if (! $mediaId) {
            return null;
        }

        $media = Media::with('variants')->find($mediaId);

        if (! $media) {
            return null;
        }

        $variant = $media->variants->firstWhere('variant', 'thumbnail-webp')
            ?? $media->variants->firstWhere('variant', 'thumbnail-jpeg');

        return $variant ? Storage::disk($variant->disk)->url($variant->path) : null;
    }
}
