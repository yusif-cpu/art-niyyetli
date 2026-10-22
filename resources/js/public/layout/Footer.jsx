import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useSiteData } from './SiteDataContext.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import { phoneHref } from '../lib/format.js';
import SocialLinks, { visibleSocialLinks } from '../components/SocialLinks.jsx';

// The contact column's light beige on wine (#C9BDB0, 9.1:1 on #3E0B0A): the brief's own value for this column only.
const CONTACT_TONE = 'text-[#C9BDB0]';

function itemLabel(locale, item) {
    return item.type === 'page' ? item.title : t(locale, `nav.${item.route_key}`);
}

function LinkColumn({ label, items, locale, testId }) {
    if (items.length === 0) return null;

    return (
        <nav aria-label={label} data-testid={testId}>
            {/* Phones: each link a 44px row (no gap between them, so the rows do not grow apart). */}
            <ul className="flex flex-col gap-step-2 max-md:gap-0">
                {items.map((item) => (
                    <li key={item.href}>
                        <a href={item.href} className="text-ui text-wine-ink hover:underline max-md:flex max-md:min-h-11 max-md:items-center">
                            {itemLabel(locale, item)}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

/**
 * Four columns, no column titles (they would be invented words): the logo (and the footer text); the collection's
 * routes from the header menu (Əsərlər, Rəssamlar, Sərgilər, Jurnal); the header's pages but home (Haqqımızda,
 * Əlaqə) followed by the admin's footer menu (the legal pages); and the phone, e-mail and reply hours in light beige,
 * then the address and the social links when set. The home link is left out: the logo is it. An empty field shows
 * no line, and an empty column is not drawn at all. One column below 768px. Wine section: wine-ink, wine-ink-muted
 * and the contact beige only, never Signal (3.94:1 on wine). data-surface switches the focus ring. A 1px surface line at
 * 14% on top keeps a wine band above it from running into the footer.
 */
export default function Footer() {
    const { locale } = useLocale();
    const { navigation, settings, socialLinks } = useSiteData();
    const headerItems = Array.isArray(navigation.data?.header) ? navigation.data.header : [];
    const footerItems = Array.isArray(navigation.data?.footer) ? navigation.data.footer : [];
    const routeItems = headerItems.filter((item) => item.type === 'route');
    const pageItems = [...headerItems.filter((item) => item.type !== 'route' && item.href !== '/'), ...footerItems];
    const site = settings.data || {};
    const phoneLink = phoneHref(site.phone);
    // No address, hours, e-mail, phone or social link: no contact column at all. An empty grid item still takes a row
    // on phones, and the row gap above it left a blank band at the bottom of the footer.
    const hasContact = Boolean(site.address || site.opening_hours || site.contact_email || site.phone || visibleSocialLinks(socialLinks.data).length);

    return (
        <footer data-surface="wine" className="border-t border-surface/14 bg-wine px-page pt-step-8 pb-step-7 font-ui text-wine-ink">
            <div className="grid gap-step-7 md:grid-cols-4 md:gap-step-6" data-testid="footer-columns">
                <div className="flex flex-col items-start gap-step-4">
                    {/* The same lockup as the header, larger, in brand red on wine (4.10:1). 48px tall: about the
                        width the old 3 : 1 lockup had at 40px (118 against 121px). */}
                    <a href="/" className="inline-flex min-h-11 items-center text-brand" data-testid="footer-brand">
                        <BrandLogo variant="lockup" className="h-12" />
                    </a>
                    {site.footer_text && <p className="max-w-xs text-meta text-wine-ink-muted">{site.footer_text}</p>}
                </div>

                {/* Named apart from the header's "Main" menu: two landmarks must not share a name. */}
                <LinkColumn label={t(locale, 'nav.footerSite')} items={routeItems} locale={locale} testId="footer-nav" />
                <LinkColumn label={t(locale, 'nav.footerLegal')} items={pageItems} locale={locale} testId="footer-legal" />

                {hasContact && (
                    <div className={`flex flex-col items-start gap-step-4 text-meta ${CONTACT_TONE}`} data-testid="footer-contact">
                        {(site.phone || site.contact_email || site.opening_hours) && (
                            <div className="flex flex-col gap-step-1">
                                {site.phone && (
                                    <a href={phoneLink} className="figures hover:underline max-md:flex max-md:min-h-11 max-md:items-center">
                                        {site.phone}
                                    </a>
                                )}
                                {site.contact_email && (
                                    <a href={`mailto:${site.contact_email}`} className="hover:underline max-md:flex max-md:min-h-11 max-md:items-center">
                                        {site.contact_email}
                                    </a>
                                )}
                                {site.opening_hours && <p className="figures">{site.opening_hours}</p>}
                            </div>
                        )}
                        {site.address && <p className="leading-relaxed">{site.address}</p>}
                        <SocialLinks
                            links={socialLinks.data}
                            className="gap-x-step-4 gap-y-step-2"
                            imgClassName="h-5 w-5 object-contain"
                            textClassName="text-label hover:underline"
                        />
                    </div>
                )}
            </div>
        </footer>
    );
}
