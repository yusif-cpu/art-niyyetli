import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { getNavigation } from '../services/navigation.js';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';

function itemLabel(locale, item) {
    return item.type === 'page' ? item.title : t(locale, `nav.${item.route_key}`);
}

export default function Header() {
    const { locale } = useLocale();
    const navigation = useApiData(() => getNavigation(locale), [locale]);
    const headerItems = Array.isArray(navigation.data?.header) ? navigation.data.header : [];

    return (
        <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <a href="/" className="text-lg font-semibold">ArtNiyyətli</a>
            <nav className="flex items-center gap-6">
                {headerItems.map((item) => (
                    <a key={item.href} href={item.href} className="text-sm text-neutral-700 hover:text-neutral-900">
                        {itemLabel(locale, item)}
                    </a>
                ))}
                <LocaleSwitcher />
            </nav>
        </header>
    );
}
