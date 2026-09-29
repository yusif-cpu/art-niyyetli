import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { useApiData } from '../lib/useApiData.js';
import { useSiteSettings } from '../layout/SiteDataContext.jsx';
import { getEnquirySubjects } from '../services/enquiries.js';
import EnquiryForm from '../components/EnquiryForm.jsx';
import ErrorState from '../components/ErrorState.jsx';

// "buy" needs an artwork code (E17 answers 422 without one): it belongs to the artwork page's form, not this one.
const ARTWORK_ONLY_SUBJECTS = ['buy'];

/** A map search for the address, opened in a new window — no embedded map (the CSP blocks it, and it tracks). */
export function mapHref(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function Details({ settings, locale }) {
    const rows = [
        settings?.address && {
            key: 'address',
            label: t(locale, 'contact.address'),
            value: (
                <>
                    <span className="block whitespace-pre-line">{settings.address}</span>
                    <a href={mapHref(settings.address)} target="_blank" rel="noopener noreferrer" className="mt-step-1 inline-block text-meta text-ink underline decoration-1 underline-offset-2">
                        {t(locale, 'contact.openMap')}
                    </a>
                </>
            ),
        },
        settings?.phone && { key: 'phone', label: t(locale, 'contact.phone'), value: <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`} className="figures text-ink">{settings.phone}</a> },
        settings?.contact_email && { key: 'email', label: t(locale, 'contact.email'), value: <a href={`mailto:${settings.contact_email}`} className="text-ink">{settings.contact_email}</a> },
        settings?.opening_hours && { key: 'hours', label: t(locale, 'contact.hours'), value: <span className="figures whitespace-pre-line">{settings.opening_hours}</span> },
    ].filter(Boolean);
    if (rows.length === 0) return null;

    return (
        <dl className="flex flex-col gap-step-4 text-ui" data-testid="contact-details">
            {rows.map((row) => (
                <div key={row.key}>
                    <dt className="text-label text-ink-muted">{row.label}</dt>
                    <dd className="mt-step-1">{row.value}</dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Contact: the enquiry form with a subject choice (E16), and the gallery's address, phone, e-mail and hours from the
 * site settings (E14, shared shell data). A "open in map" link instead of a map frame. Social links stay in the footer.
 */
export default function ContactPage() {
    const { locale } = useLocale();
    const settings = useSiteSettings();
    const [retryToken, setRetryToken] = useState(0);
    const { data: subjects, loading, error } = useApiData(() => getEnquirySubjects(locale), [locale, retryToken]);
    const [selectedSubject, setSelectedSubject] = useState('');

    usePageMeta({ title: `${t(locale, 'contact.title')} | ArtNiyyətli` });

    const labeledSubjects = Array.isArray(subjects) ? subjects.filter((item) => item.label && !ARTWORK_ONLY_SUBJECTS.includes(item.key)) : [];
    const subject = labeledSubjects.some((item) => item.key === selectedSubject) ? selectedSubject : labeledSubjects[0]?.key || '';

    return (
        <div className="px-page pt-step-8 pb-step-9 font-ui">
            <h1 className="border-b border-line pb-step-5 text-display">{t(locale, 'contact.title')}</h1>

            {/* A 36rem-capped column beside a flexible one needs room for both: at md (768px) the cap plus its gap
                already exceeds the content width, squeezing the flexible column until its content overflows. The
                other pages with this exact shape (CataloguePage, ArtworkDetailPage) already wait for lg for the
                same reason, so this one now matches them instead of switching a tablet-width column too early. */}
            <div className="mt-step-7 grid gap-step-8 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)] lg:gap-step-9">
                <aside className="lg:col-start-2 lg:row-start-1">
                    <Details settings={settings} locale={locale} />
                </aside>

                <div className="lg:col-start-1 lg:row-start-1">
                    {loading && !subjects && (
                        <div aria-busy="true" data-testid="contact-skeleton">
                            <div aria-hidden="true" className="flex flex-col gap-step-4">
                                {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 w-full border border-line bg-surface-field" />)}
                            </div>
                        </div>
                    )}
                    {error && <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />}
                    {!error && subjects && (
                        <div className="flex flex-col gap-step-4">
                            {labeledSubjects.length > 0 && (
                                <label className="block text-label text-ink-muted">
                                    {t(locale, 'contact.subjectLabel')}
                                    <select
                                        value={subject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="mt-step-1 block min-h-11 w-full cursor-pointer border border-line-strong bg-surface-raised px-step-3 py-step-2 text-ui text-ink"
                                    >
                                        {labeledSubjects.map((item) => (
                                            <option key={item.key} value={item.key}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            <EnquiryForm subject={subject} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
