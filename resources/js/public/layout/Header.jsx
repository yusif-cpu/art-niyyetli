import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useSiteData } from './SiteDataContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import BrandLogo from '../components/BrandLogo.jsx';

// Same breakpoint as the header's `md`: from here the navigation is a row, not a panel.
const PANEL_BELOW_PX = 768;

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

/**
 * While the phone panel is open: Escape closes it and gives the focus back to the "menyu" button, and the page
 * behind does not scroll (the root's overflow, set through the CSSOM, is put back on close).
 */
function usePanel(open, setOpen, buttonRef) {
    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            setOpen(false);
            buttonRef.current?.focus();
        };
        document.addEventListener('keydown', onKeyDown);
        const root = document.documentElement;
        const locked = window.innerWidth < PANEL_BELOW_PX;
        const previous = root.style.overflow;
        if (locked) root.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            if (locked) root.style.overflow = previous;
        };
    }, [open, setOpen, buttonRef]);
}

export default function Header() {
    const { locale } = useLocale();
    const { navigation } = useSiteData();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButton = useRef(null);
    const headerItems = Array.isArray(navigation.data?.header) ? navigation.data.header : [];
    const hasMenu = headerItems.length > 0;
    const pathname = window.location.pathname;
    usePanel(menuOpen, setMenuOpen, menuButton);

    return (
        <header className="sticky top-0 z-20 border-b border-line bg-surface font-ui text-ink">
            {/*
              Widths (Montserrat is ~20% wider than the demo's face, see plan §6.3). Social links live in the footer only.
              ≥ lg  one row; a safety net for long admin menus: the navigation shrinks and wraps inside (right-aligned);
              md    two rows: brand + language, then the navigation, left-aligned;
              < md  brand + a "menyu" text toggle; the navigation and the language open as a plain panel below.
              Touch targets are 44px; negative margins keep the bar's visible height.
            */}
            <div className="flex flex-wrap items-center gap-x-step-6 gap-y-step-4 px-page py-step-5 lg:flex-nowrap">
                {/* The logo in brand red (a brand colour, not Signal): the lockup, and below 400px the mark alone.
                    Its colour never changes on hover or focus; focus shows only the outline. */}
                <a href="/" className="-my-2 inline-flex min-h-11 min-w-11 shrink-0 items-center text-brand" data-testid="header-brand">
                    <BrandLogo variant="lockup" className="hidden h-7 min-[400px]:block" />
                    <BrandLogo variant="mark" className="h-7 min-[400px]:hidden" />
                </a>

                {/* Below md the navigation collapses behind a plain text toggle: no animation. */}
                {hasMenu && (
                    <nav
                        id="site-menu"
                        aria-label={t(locale, 'nav.mainLabel')}
                        className={`${menuOpen ? 'flex' : 'hidden'} order-last w-full flex-col items-stretch max-md:max-h-[calc(100dvh-6rem)] max-md:overflow-y-auto md:flex md:flex-row md:flex-wrap md:items-baseline md:gap-x-step-6 md:gap-y-step-2 lg:order-none lg:w-auto lg:min-w-0 lg:flex-1 lg:justify-end`}
                        onClick={(event) => {
                            if (event.target.closest('a')) setMenuOpen(false);
                        }}
                    >
                        {headerItems.map((item) => {
                            const active = isActive(item.href, pathname);

                            // Phone panel: a 44px row per link. Row layout: the text keeps its underline and a
                            // transparent ::after stretches the hit area to 44px tall.
                            return (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`whitespace-nowrap text-nav transition-colors duration-150 ease-standard max-md:flex max-md:min-h-11 max-md:items-center md:relative md:border-b md:pb-1 md:after:absolute md:after:inset-x-0 md:after:-inset-y-3 md:after:content-[''] ${active ? 'text-signal-ink md:border-signal' : 'text-ink-muted hover:text-ink md:border-transparent'}`}
                                >
                                    {itemLabel(locale, item)}
                                </a>
                            );
                        })}
                        {/* The language choice travels with the menu on phones. */}
                        {menuOpen && <LocaleSwitcher className="mt-step-3 border-t border-line pt-step-3 md:hidden" />}
                    </nav>
                )}

                <div className="ml-auto flex shrink-0 items-center gap-step-5 lg:ml-0">
                    <LocaleSwitcher className={`${hasMenu ? 'hidden md:flex' : ''} -my-2 lg:border-l lg:border-line lg:pl-step-5`} />
                    {hasMenu && (
                        <button
                            ref={menuButton}
                            type="button"
                            aria-expanded={menuOpen}
                            aria-controls="site-menu"
                            onClick={() => setMenuOpen((open) => !open)}
                            className="-my-2 -mr-step-3 inline-flex min-h-11 cursor-pointer items-center px-step-3 text-nav text-ink md:hidden"
                        >
                            {t(locale, 'nav.menu')}
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
