import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { listExhibitions } from '../services/exhibitions.js';
import ExhibitionRow from '../components/ExhibitionRow.jsx';
import Pagination from '../components/Pagination.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageHeader from '../components/PageHeader.jsx';

// Current and upcoming shows are few: one request each, the API's largest page. The archive grows and pages.
const OPEN_PER_PAGE = 60;

function Group({ id, title, items, children }) {
    if (items.length === 0) return null;

    return (
        <section aria-labelledby={id}>
            <h2 id={id} className="mb-step-4 text-heading">{title}</h2>
            <ul className="border-t border-line">
                {items.map((exhibition) => <ExhibitionRow key={exhibition.slug} exhibition={exhibition} />)}
            </ul>
            {children}
        </section>
    );
}

function Skeleton() {
    return (
        <div aria-busy="true" data-testid="exhibitions-skeleton">
            <div aria-hidden="true" className="border-t border-line">
                {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex gap-step-5 border-b border-line py-step-4">
                        <div className="h-5 w-1/3 bg-surface-field" />
                        <div className="h-4 w-1/4 bg-surface-field" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * All exhibitions in three groups — current, upcoming, archive (the admin's stored status, E9 `filter`) — each a
 * list of rows (title, dates, venue, status), an empty group left out. The archive pages. No Signal on the page.
 */
export default function ExhibitionsPage() {
    const { locale } = useLocale();
    const [archivePage, setArchivePage] = useState(1);
    const [retryToken, setRetryToken] = useState(0);
    const current = useApiData(() => listExhibitions(locale, { filter: 'current', per_page: OPEN_PER_PAGE }), [locale, retryToken]);
    const upcoming = useApiData(() => listExhibitions(locale, { filter: 'upcoming', per_page: OPEN_PER_PAGE }), [locale, retryToken]);
    const archive = useApiData(() => listExhibitions(locale, { filter: 'archive', page: archivePage > 1 ? archivePage : undefined }), [locale, archivePage, retryToken]);

    usePageMeta({ title: `${t(locale, 'nav.exhibitions')} | ArtNiyyətli` });

    const requests = [current, upcoming, archive];
    const error = requests.find((r) => r.error)?.error;
    const loading = requests.some((r) => r.loading && !r.data);
    const list = (r) => (Array.isArray(r.data) ? r.data : []);
    // Page 1 of the archive decides whether the group exists; a later page may come back empty and still shows the pager.
    const empty = !loading && !error && list(current).length === 0 && list(upcoming).length === 0 && list(archive).length === 0 && archivePage === 1;

    return (
        <div className="px-page pb-step-9 font-ui">
            <PageHeader label={t(locale, 'labels.calendar')} title={t(locale, 'nav.exhibitions')} description={t(locale, 'exhibitions.description')} />

            <div className="mt-step-7">
                {error && <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />}
                {!error && loading && <Skeleton />}
                {empty && <p className="text-ui text-ink-muted">{t(locale, 'exhibitions.empty')}</p>}
                {!error && !loading && !empty && (
                    <div className="flex flex-col gap-step-8">
                        <Group id="exhibitions-current" title={t(locale, 'home.currentExhibitions')} items={list(current)} />
                        <Group id="exhibitions-upcoming" title={t(locale, 'home.upcomingExhibitions')} items={list(upcoming)} />
                        <Group id="exhibitions-archive" title={t(locale, 'exhibitions.archive')} items={list(archive)}>
                            <Pagination meta={archive.meta} onPageChange={setArchivePage} />
                        </Group>
                    </div>
                )}
            </div>
        </div>
    );
}
