import { useLocale } from '../i18n/LocaleContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { getSiteSettings } from '../services/siteSettings.js';
import { listSocialLinks } from '../services/socialLinks.js';
import { listPages } from '../services/pages.js';

function pageHref(page) {
    return page.type === 'home' ? '/' : `/${page.slug}`;
}

export default function Footer() {
    const { locale } = useLocale();
    const settings = useApiData(() => getSiteSettings(locale), [locale]);
    const socialLinks = useApiData(() => listSocialLinks(locale), [locale]);
    const pages = useApiData(() => listPages(locale), [locale]);
    const footerPages = (Array.isArray(pages.data) ? pages.data : []).filter((page) => page.nav_placement === 'footer');

    return (
        <footer className="border-t border-neutral-200 px-6 py-8 text-sm text-neutral-600">
            {settings.data?.footer_text && <p className="mb-3">{settings.data.footer_text}</p>}
            {settings.data?.contact_email && <p>{settings.data.contact_email}</p>}
            {settings.data?.phone && <p>{settings.data.phone}</p>}
            {settings.data?.address && <p>{settings.data.address}</p>}
            {settings.data?.opening_hours && <p>{settings.data.opening_hours}</p>}

            {socialLinks.data && socialLinks.data.length > 0 && (
                <div className="mt-4 flex gap-4">
                    {socialLinks.data.map((link) => (
                        <a key={link.platform} href={link.url} target="_blank" rel="noreferrer" className="capitalize underline">
                            {link.platform}
                        </a>
                    ))}
                </div>
            )}

            {footerPages.length > 0 && (
                <nav className="mt-4 flex flex-wrap gap-4" aria-label="Legal">
                    {footerPages.map((page) => (
                        <a key={page.slug} href={pageHref(page)} className="underline">
                            {page.title}
                        </a>
                    ))}
                </nav>
            )}
        </footer>
    );
}
