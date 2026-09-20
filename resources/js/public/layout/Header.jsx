import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useSiteData } from './SiteDataContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import BrandMark from '../components/BrandMark.jsx';
import SocialLinks from '../components/SocialLinks.jsx';

function itemLabel(locale, item) {
    return item.type === 'page' ? item.title : t(locale, `nav.${item.route_key}`);
}

export default function Header() {
    const { locale } = useLocale();
    const { navigation, settings, socialLinks } = useSiteData();
    const headerItems = Array.isArray(navigation.data?.header) ? navigation.data.header : [];

    return (
        <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <a href="/">
                <BrandMark
                    logoUrl={settings.data?.logo_url}
                    displayMode={settings.data?.logo_display_mode || 'logo_text'}
                    brandText={settings.data?.brand_text || 'ArtNiyyətli'}
                />
            </a>
            <nav className="flex items-center gap-6">
                {headerItems.map((item) => (
                    <a key={item.href} href={item.href} className="text-sm text-neutral-700 hover:text-neutral-900">
                        {itemLabel(locale, item)}
                    </a>
                ))}
                <SocialLinks links={socialLinks.data} className="gap-3 text-sm text-neutral-700" textClassName="capitalize hover:text-neutral-900" />
                <LocaleSwitcher />
            </nav>
        </header>
    );
}
