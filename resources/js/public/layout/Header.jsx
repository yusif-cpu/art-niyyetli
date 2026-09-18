import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { listPages } from '../services/pages.js';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';

const CATALOGUE_ITEMS = [
    { href: '/artworks', key: 'artworks' },
    { href: '/artists', key: 'artists' },
    { href: '/exhibitions', key: 'exhibitions' },
    { href: '/articles', key: 'articles' },
];

function pageHref(page) {
    return page.type === 'home' ? '/' : `/${page.slug}`;
}

export default function Header() {
    const { locale } = useLocale();
    const pages = useApiData(() => listPages(locale), [locale]);
    const headerPages = (Array.isArray(pages.data) ? pages.data : []).filter((page) => page.nav_placement === 'header');

    return (
        <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <a href="/" className="text-lg font-semibold">ArtNiyyətli</a>
            <nav className="flex items-center gap-6">
                {headerPages.map((page) => (
                    <a key={page.slug} href={pageHref(page)} className="text-sm text-neutral-700 hover:text-neutral-900">
                        {page.title}
                    </a>
                ))}
                {CATALOGUE_ITEMS.map((item) => (
                    <a key={item.href} href={item.href} className="text-sm text-neutral-700 hover:text-neutral-900">
                        {t(locale, `nav.${item.key}`)}
                    </a>
                ))}
                <LocaleSwitcher />
            </nav>
        </header>
    );
}
