import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useSiteData } from './SiteDataContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import BrandMark from '../components/BrandMark.jsx';
import SocialLinks from '../components/SocialLinks.jsx';

function itemLabel(locale, item) {
    return item.type === 'page' ? item.title : t(locale, `nav.${item.route_key}`);
}

// An item is active on its own path and below it, so an artwork page keeps "Əsərlər" active. The home item only
// matches "/" itself. SiteShell re-renders on every route change, so reading the location here stays current.
function isActive(href, pathname) {
    if (!href) return false;
    if (href === '/') return pathname === '/';

    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
    const { locale } = useLocale();
    const { navigation, settings, socialLinks } = useSiteData();
    const [menuOpen, setMenuOpen] = useState(false);
    const headerItems = Array.isArray(navigation.data?.header) ? navigation.data.header : [];
    const hasMenu = headerItems.length > 0 || (Array.isArray(socialLinks.data) && socialLinks.data.length > 0);
    const pathname = window.location.pathname;

    return (
        <header className="sticky top-0 z-20 border-b border-line bg-surface font-ui text-ink">
            {/*
              Widths (Montserrat is ~20% wider than the demo's face, see plan §6.3):
              ≥ lg  one row; if the menu does not fit, it shrinks and the navigation wraps inside it (right-aligned);
              md    two rows: brand + language, then navigation + social links, left-aligned;
              < md  brand + language + a "menyu" text toggle; the menu opens as a plain list below.
            */}
            <div className="flex flex-wrap items-center gap-x-step-6 gap-y-step-4 px-page py-step-5 lg:flex-nowrap">
                <a href="/" className="shrink-0">
                    <BrandMark
                        logoUrl={settings.data?.logo_url}
                        displayMode={settings.data?.logo_display_mode || 'logo_text'}
                        brandText={settings.data?.brand_text || 'ArtNiyyətli'}
                        imgClassName="h-8.5 w-auto"
                        textClassName="text-subheading font-bold tracking-display text-signal"
                    />
                </a>

                {/* Below md the menu (navigation + social links) collapses behind a plain text toggle: no animation. */}
                <div
                    id="site-menu"
                    className={`${menuOpen ? 'flex' : 'hidden'} order-last w-full flex-col gap-step-5 md:flex md:flex-row md:items-baseline md:justify-between md:gap-step-6 lg:order-none lg:w-auto lg:min-w-0 lg:flex-1 lg:justify-end`}
                    onClick={(event) => {
                        if (event.target.closest('a')) setMenuOpen(false);
                    }}
                >
                    {headerItems.length > 0 && (
                        <nav aria-label="Main" className="flex flex-col items-start gap-step-3 md:flex-row md:flex-wrap md:items-baseline md:gap-x-step-6 md:gap-y-step-2 lg:justify-end">
                            {headerItems.map((item) => {
                                const active = isActive(item.href, pathname);

                                return (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        aria-current={active ? 'page' : undefined}
                                        className={`whitespace-nowrap border-b pb-1 text-nav transition-colors duration-150 ease-standard ${active ? 'border-signal text-signal-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}
                                    >
                                        {itemLabel(locale, item)}
                                    </a>
                                );
                            })}
                        </nav>
                    )}
                    <SocialLinks
                        links={socialLinks.data}
                        textOnly
                        className="shrink-0 flex-nowrap gap-x-step-4 gap-y-step-2"
                        textClassName="whitespace-nowrap text-label text-ink-muted transition-colors duration-150 ease-standard hover:text-ink"
                    />
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-step-5 lg:ml-0">
                    <LocaleSwitcher className="lg:border-l lg:border-line lg:pl-step-5" />
                    {hasMenu && (
                        <button
                            type="button"
                            aria-expanded={menuOpen}
                            aria-controls="site-menu"
                            onClick={() => setMenuOpen((open) => !open)}
                            className="cursor-pointer text-nav text-ink md:hidden"
                        >
                            {t(locale, 'nav.menu')}
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
