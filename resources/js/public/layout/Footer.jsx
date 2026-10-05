import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useSiteData } from './SiteDataContext.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import SocialLinks, { visibleSocialLinks } from '../components/SocialLinks.jsx';

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
 * Four columns, no column titles (they would be invented words): the logo and the footer text; the site navigation
 * (the header menu); the legal pages (the admin's footer menu); contact details and social links. One column below
 * 768px. Wine section: only wine-ink and wine-ink-muted, never Signal (3.94:1 on wine). data-surface switches the
 * focus ring.
 */
export default function Footer() {
    const { locale } = useLocale();
    const { navigation, settings, socialLinks } = useSiteData();
    const headerItems = Array.isArray(navigation.data?.header) ? navigation.data.header : [];
    const footerItems = Array.isArray(navigation.data?.footer) ? navigation.data.footer : [];
    const site = settings.data || {};
    const phoneHref = site.phone ? `tel:${site.phone.replace(/[^\d+]/g, '')}` : null;
    // No address, hours, e-mail, phone or social link: no contact column at all. An empty grid item still takes a row
    // on phones, and the row gap above it left a blank band at the bottom of the footer.
    const hasContact = Boolean(site.address || site.opening_hours || site.contact_email || site.phone || visibleSocialLinks(socialLinks.data).length);

    return (
        <footer data-surface="wine" className="bg-wine px-page pt-step-8 pb-step-7 font-ui text-wine-ink">
            <div className="grid gap-step-7 md:grid-cols-4 md:gap-step-6" data-testid="footer-columns">
                <div className="flex flex-col items-start gap-step-4">
                    {/* The same lockup as the header, larger, in brand red on wine (4.10:1). */}
                    <a href="/" className="inline-flex min-h-11 items-center text-brand" data-testid="footer-brand">
                        <BrandLogo variant="lockup" className="h-10" />
                    </a>
                    {site.footer_text && <p className="max-w-xs text-meta text-wine-ink-muted">{site.footer_text}</p>}
                </div>

                {/* Named apart from the header's "Main" menu: two landmarks must not share a name. */}
                <LinkColumn label={t(locale, 'nav.footerSite')} items={headerItems} locale={locale} testId="footer-nav" />
                <LinkColumn label={t(locale, 'nav.footerLegal')} items={footerItems} locale={locale} testId="footer-legal" />

                {hasContact && (
                    <div className="flex flex-col items-start gap-step-4 text-meta" data-testid="footer-contact">
                        {(site.address || site.opening_hours) && (
                            <div className="leading-relaxed text-wine-ink-muted">
                                {site.address && <p>{site.address}</p>}
                                {site.opening_hours && <p className="figures">{site.opening_hours}</p>}
                            </div>
                        )}
                        {(site.contact_email || site.phone) && (
                            <div className="flex flex-col gap-step-1">
                                {site.contact_email && (
                                    <a href={`mailto:${site.contact_email}`} className="hover:underline max-md:flex max-md:min-h-11 max-md:items-center">
                                        {site.contact_email}
                                    </a>
                                )}
                                {site.phone && (
                                    <a href={phoneHref} className="figures hover:underline max-md:flex max-md:min-h-11 max-md:items-center">
                                        {site.phone}
                                    </a>
                                )}
                            </div>
                        )}
                        <SocialLinks
                            links={socialLinks.data}
                            className="gap-x-step-4 gap-y-step-2"
                            imgClassName="h-5 w-5 object-contain"
                            textClassName="text-label text-wine-ink hover:underline"
                        />
                    </div>
                )}
            </div>
        </footer>
    );
}
