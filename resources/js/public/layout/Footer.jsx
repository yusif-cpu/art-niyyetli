import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useSiteData } from './SiteDataContext.jsx';
import BrandMark from '../components/BrandMark.jsx';
import SocialLinks from '../components/SocialLinks.jsx';

// The footer menu is one flat, admin-managed list: split it into up to three columns of about four links each, so the
// column count follows the data instead of the demo's fixed three.
const LINKS_PER_COLUMN = 4;
const MAX_COLUMNS = 3;

function itemLabel(locale, item) {
    return item.type === 'page' ? item.title : t(locale, `nav.${item.route_key}`);
}

function toColumns(items) {
    if (items.length === 0) return [];

    const count = Math.min(MAX_COLUMNS, Math.ceil(items.length / LINKS_PER_COLUMN));
    const size = Math.ceil(items.length / count);

    return Array.from({ length: count }, (_, index) => items.slice(index * size, (index + 1) * size)).filter((column) => column.length > 0);
}

// Wine section: only wine-ink and wine-ink-muted, never Signal (3.94:1 on wine). data-surface switches the focus ring.
export default function Footer() {
    const { locale } = useLocale();
    const { navigation, settings, socialLinks } = useSiteData();
    const footerItems = Array.isArray(navigation.data?.footer) ? navigation.data.footer : [];
    const columns = toColumns(footerItems);
    const site = settings.data || {};
    const phoneHref = site.phone ? `tel:${site.phone.replace(/[^\d+]/g, '')}` : null;

    return (
        <footer data-surface="wine" className="bg-wine px-page pt-step-8 pb-step-6 font-ui text-wine-ink">
            <div className={`grid gap-step-7 ${columns.length > 0 ? 'md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]' : ''}`}>
                <div className="flex flex-col items-start gap-step-4">
                    <BrandMark
                        logoUrl={site.logo_url}
                        displayMode={site.logo_display_mode || 'logo_text'}
                        brandText={site.brand_text || 'ArtNiyyətli'}
                        imgClassName="h-7.5 w-auto"
                        textClassName="text-subheading font-bold tracking-display"
                    />
                    {(site.address || site.opening_hours) && (
                        <div className="max-w-sm text-meta leading-relaxed text-wine-ink-muted">
                            {site.address && <p>{site.address}</p>}
                            {site.opening_hours && <p>{site.opening_hours}</p>}
                        </div>
                    )}
                    {(site.contact_email || site.phone) && (
                        <div className="flex flex-col gap-step-1 text-meta">
                            {site.contact_email && (
                                <a href={`mailto:${site.contact_email}`} className="hover:underline">
                                    {site.contact_email}
                                </a>
                            )}
                            {site.phone && (
                                <a href={phoneHref} className="figures hover:underline">
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

                {columns.length > 0 && (
                    <nav
                        aria-label="Footer"
                        className="grid gap-step-5 sm:grid-cols-[repeat(var(--footer-columns),minmax(0,1fr))] sm:gap-step-7"
                        style={{ '--footer-columns': columns.length }}
                    >
                        {columns.map((column, index) => (
                            <ul key={index} className="flex flex-col gap-step-2">
                                {column.map((item) => (
                                    <li key={item.href}>
                                        <a href={item.href} className="text-ui text-wine-ink hover:underline">
                                            {itemLabel(locale, item)}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </nav>
                )}
            </div>

            {site.footer_text && (
                <p className="mt-step-7 border-t border-wine-line pt-step-4 text-label text-wine-ink-muted">{site.footer_text}</p>
            )}
        </footer>
    );
}
