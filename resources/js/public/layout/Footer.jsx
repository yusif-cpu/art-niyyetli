import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { getSiteSettings } from '../services/siteSettings.js';
import { listSocialLinks } from '../services/socialLinks.js';
import { getNavigation } from '../services/navigation.js';
import BrandMark from '../components/BrandMark.jsx';
import SocialLinks from '../components/SocialLinks.jsx';

function itemLabel(locale, item) {
    return item.type === 'page' ? item.title : t(locale, `nav.${item.route_key}`);
}

export default function Footer() {
    const { locale } = useLocale();
    const settings = useApiData(() => getSiteSettings(locale), [locale]);
    const socialLinks = useApiData(() => listSocialLinks(locale), [locale]);
    const navigation = useApiData(() => getNavigation(locale), [locale]);
    const footerItems = Array.isArray(navigation.data?.footer) ? navigation.data.footer : [];

    return (
        <footer className="border-t border-neutral-200 px-6 py-8 text-sm text-neutral-600">
            <div className="mb-4">
                <BrandMark
                    logoUrl={settings.data?.logo_url}
                    displayMode={settings.data?.logo_display_mode || 'logo_text'}
                    brandText={settings.data?.brand_text || 'ArtNiyyətli'}
                    imgClassName="h-6 w-auto"
                    textClassName="text-base font-semibold"
                />
            </div>
            {settings.data?.footer_text && <p className="mb-3">{settings.data.footer_text}</p>}
            {settings.data?.contact_email && <p>{settings.data.contact_email}</p>}
            {settings.data?.phone && <p>{settings.data.phone}</p>}
            {settings.data?.address && <p>{settings.data.address}</p>}
            {settings.data?.opening_hours && <p>{settings.data.opening_hours}</p>}

            <SocialLinks links={socialLinks.data} className="mt-4 gap-4" />

            {footerItems.length > 0 && (
                <nav className="mt-4 flex flex-wrap gap-4" aria-label="Legal">
                    {footerItems.map((item) => (
                        <a key={item.href} href={item.href} className="underline">
                            {itemLabel(locale, item)}
                        </a>
                    ))}
                </nav>
            )}
        </footer>
    );
}
