import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { useApiData } from '../lib/useApiData.js';
import { seoMeta } from '../lib/seoMeta.js';
import { excerpt } from '../lib/text.js';
import { phoneHref } from '../lib/format.js';
import { useSiteSettings } from '../layout/SiteDataContext.jsx';
import { getEnquirySubjects } from '../services/enquiries.js';
import { getPage } from '../services/pages.js';
import EnquiryForm from '../components/EnquiryForm.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Emphasis from '../components/Emphasis.jsx';

// "buy" needs an artwork code (E17 answers 422 without one): it belongs to the artwork page's form, not this one.
const ARTWORK_ONLY_SUBJECTS = ['buy'];

/** A map search for the address, opened in a new window — no embedded map (the CSP blocks it, and it tracks). */
export function mapHref(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function Details({ settings, locale }) {
    const rows = [
        settings?.phone && { key: 'phone', label: t(locale, 'contact.phone'), value: <a href={phoneHref(settings.phone)} className="figures text-[clamp(28px,2.4vw,34px)] leading-[1.15] font-semibold tracking-[-0.02em] text-wine">{settings.phone}</a> },
        settings?.contact_email && { key: 'email', label: t(locale, 'contact.email'), value: <a href={`mailto:${settings.contact_email}`} className="text-[clamp(20px,1.7vw,24px)] leading-[1.25] font-semibold break-all text-wine">{settings.contact_email}</a> },
        settings?.opening_hours && { key: 'hours', label: t(locale, 'pages.contact.hours'), value: <span className="figures text-[19px] leading-[1.35] whitespace-pre-line text-ink md:text-[20px]">{settings.opening_hours}</span> },
        settings?.address && {
            key: 'address',
            label: t(locale, 'contact.address'),
            value: (
                <>
                    <span className="block text-[17px] leading-[1.45] whitespace-pre-line text-ink">{settings.address}</span>
                    <a href={mapHref(settings.address)} target="_blank" rel="noopener noreferrer" className="mt-step-2 inline-flex min-h-11 items-center text-[13px] font-semibold text-wine max-md:text-[14px]">
                        <span className="link-line">{t(locale, 'contact.openMap')}</span>
                    </a>
                </>
            ),
        },
    ].filter(Boolean);
    if (rows.length === 0) return null;

    return (
        <dl className="border-t border-line" data-testid="contact-details">
            {rows.map((row) => (
                <div key={row.key} className="border-b border-line py-step-5">
                    <dt className="text-[13px] text-ink-muted max-md:text-[14px]">{row.label}</dt>
                    <dd className="mt-step-2">{row.value}</dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Contact (krem-bordo): the wine header band ("Gəlin *danışaq*"), then two columns (1fr | 1.15fr). Left: the direct
 * contact rows from the site settings (E14) — the phone 34px 600 wine (tel:), the e-mail 24px 600 (mailto:), the reply
 * hours, the address only when set — and "Nə ilə kömək edə bilərik": four small surface-sunk cards of fixed dictionary
 * text. Right: the enquiry form (E16 subjects, E17) on a surface-sunk card, 56px inside, under "Sorğu *göndərin*".
 * Fields and validation are the form's own, unchanged. Social links stay in the footer.
 */
export default function ContactPage() {
    const { locale } = useLocale();
    const settings = useSiteSettings();
    const [retryToken, setRetryToken] = useState(0);
    const { data: subjects, loading, error } = useApiData(() => getEnquirySubjects(locale), [locale, retryToken]);
    const [selectedSubject, setSelectedSubject] = useState('');

    // This page's own content (the enquiry form, address/phone/email/hours) never comes from a CMS Page — but the
    // server's SSR head for /contact does resolve one (PublicPageSeoResolver's generic static-page lookup, by slug),
    // so without this fetch the client has no description at all to hydrate with: it would drop the tag entirely
    // and leave og:description/twitter:description frozen at whatever locale the server happened to render first.
    // Fetching the same record keeps client and server in agreement in both locales, admin content unchanged.
    const { data: contactPage } = useApiData(() => getPage(locale, 'contact'), [locale]);
    usePageMeta(seoMeta(contactPage, { title: t(locale, 'contact.title'), description: excerpt(contactPage?.content) || undefined }));

    const labeledSubjects = Array.isArray(subjects) ? subjects.filter((item) => item.label && !ARTWORK_ONLY_SUBJECTS.includes(item.key)) : [];
    const subject = labeledSubjects.some((item) => item.key === selectedSubject) ? selectedSubject : labeledSubjects[0]?.key || '';
    const help = t(locale, 'pages.contact.help');

    return (
        <div className="font-ui">
            <PageHeader label={t(locale, 'contact.title')} title={t(locale, 'pages.contact.title')} description={t(locale, 'pages.contact.description')} />

            <div className="grid grid-cols-1 gap-step-8 px-page py-[clamp(80px,9.72vw,140px)] lg:grid-cols-[1fr_1.15fr] lg:gap-[100px]">
                <aside className="min-w-0">
                    <p className="mb-step-5 text-[13px] font-semibold text-wine max-md:text-[14px]">{t(locale, 'pages.contact.direct')}</p>
                    <Details settings={settings} locale={locale} />

                    <h2 className="mt-step-8 mb-step-5 text-[13px] font-semibold text-wine max-md:text-[14px]">{t(locale, 'pages.contact.helpTitle')}</h2>
                    <ul className="grid grid-cols-1 gap-step-4 sm:grid-cols-2" data-testid="contact-help">
                        {help.map((item) => (
                            <li key={item.title} className="bg-surface-sunk px-step-5 py-step-5">
                                <p className="text-[16px] leading-[1.3] font-semibold text-wine">{item.title}</p>
                                <p className="mt-step-1 text-meta text-ink-muted">{item.text}</p>
                            </li>
                        ))}
                    </ul>
                </aside>

                <div className="min-w-0 bg-surface-sunk p-step-6 md:p-[56px]" data-testid="contact-form-card">
                    <h2 className="text-[clamp(30px,2.7vw,38px)] leading-[1.1] font-bold tracking-[-0.03em] text-wine">
                        <Emphasis text={t(locale, 'pages.contact.formTitle')} />
                    </h2>
                    <p className="mt-step-3 mb-step-6 font-editorial text-[17px] text-ink-muted">{t(locale, 'pages.contact.formNote')}</p>
                    {loading && !subjects && (
                        <div aria-busy="true" data-testid="contact-skeleton">
                            <div aria-hidden="true" className="flex flex-col gap-step-4">
                                {[0, 1, 2, 3].map((i) => <div key={i} className="h-[54px] w-full bg-surface" />)}
                            </div>
                        </div>
                    )}
                    {error && <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />}
                    {!error && subjects && (
                        <div className="flex flex-col gap-step-4">
                            {labeledSubjects.length > 0 && (
                                <label className="block text-[13px] leading-[1.35] font-semibold text-ink max-md:text-[14px]">
                                    {t(locale, 'contact.subjectLabel')}
                                    <select
                                        value={subject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="mt-step-2 block min-h-[54px] w-full cursor-pointer border border-field-line bg-surface px-step-4 py-step-3 text-ui font-normal text-ink"
                                    >
                                        {labeledSubjects.map((item) => (
                                            <option key={item.key} value={item.key}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            {/* After a successful send the form empties itself; the subject is this page's state, so
                                it goes back to the first subject here. */}
                            <EnquiryForm subject={subject} onSuccess={() => setSelectedSubject('')} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
