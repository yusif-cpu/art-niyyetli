import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useSiteData } from './SiteDataContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import BrandLogo from '../components/BrandLogo.jsx';

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
    const { navigation } = useSiteData();
    const [menuOpen, setMenuOpen] = useState(false);
    const headerItems = Array.isArray(navigation.data?.header) ? navigation.data.header : [];
    const hasMenu = headerItems.length > 0;
    const pathname = window.location.pathname;

    return (
        <header className="sticky top-0 z-20 border-b border-line bg-surface font-ui text-ink">
            {/*
              Widths (Montserrat is ~20% wider than the demo's face, see plan §6.3). Social links live in the footer only.
              ≥ lg  one row; a safety net for long admin menus: the navigation shrinks and wraps inside (right-aligned);
              md    two rows: brand + language, then the navigation, left-aligned;
              < md  brand + language + a "menyu" text toggle; the navigation opens as a plain list below.
            */}
            <div className="flex flex-wrap items-center gap-x-step-6 gap-y-step-4 px-page py-step-5 lg:flex-nowrap">
                {/* The logo in wine (never Signal): the lockup, and below 375px the mark alone. */}
                <a href="/" className="shrink-0 text-wine" data-testid="header-brand">
                    <BrandLogo variant="lockup" className="hidden h-7 min-[375px]:block" />
                    <BrandLogo variant="mark" className="h-7 min-[375px]:hidden" />
                </a>

                {/* Below md the navigation collapses behind a plain text toggle: no animation. */}
                {hasMenu && (
                    <nav
                        id="site-menu"
                        aria-label="Main"
                        className={`${menuOpen ? 'flex' : 'hidden'} order-last w-full flex-col items-start gap-step-3 md:flex md:flex-row md:flex-wrap md:items-baseline md:gap-x-step-6 md:gap-y-step-2 lg:order-none lg:w-auto lg:min-w-0 lg:flex-1 lg:justify-end`}
                        onClick={(event) => {
                            if (event.target.closest('a')) setMenuOpen(false);
                        }}
                    >
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
