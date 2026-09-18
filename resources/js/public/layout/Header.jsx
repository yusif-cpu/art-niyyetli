import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';

const NAV_ITEMS = [
    { href: '/', key: 'home' },
    { href: '/artworks', key: 'artworks' },
    { href: '/artists', key: 'artists' },
    { href: '/exhibitions', key: 'exhibitions' },
    { href: '/articles', key: 'articles' },
    { href: '/contact', key: 'contact' },
];

export default function Header() {
    const { locale } = useLocale();

    return (
        <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <a href="/" className="text-lg font-semibold">ArtNiyyətli</a>
            <nav className="flex items-center gap-6">
                {NAV_ITEMS.map((item) => (
                    <a key={item.href} href={item.href} className="text-sm text-neutral-700 hover:text-neutral-900">
                        {t(locale, `nav.${item.key}`)}
                    </a>
                ))}
                <LocaleSwitcher />
            </nav>
        </header>
    );
}
