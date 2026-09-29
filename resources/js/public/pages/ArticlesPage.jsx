import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { listArticles } from '../services/articles.js';
import ArticleCard from '../components/ArticleCard.jsx';
import Pagination from '../components/Pagination.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageHeader from '../components/PageHeader.jsx';

/**
 * The journal: newest first (E11), one article per row between hairlines — date and type, title, short text, cover.
 * Pages. No type filter: E11 takes only locale, page and per_page.
 */
export default function ArticlesPage() {
    const { locale } = useLocale();
    const [page, setPage] = useState(1);
    const [retryToken, setRetryToken] = useState(0);
    const { data, meta, loading, error } = useApiData(() => listArticles(locale, page > 1 ? { page } : undefined), [locale, page, retryToken]);

    usePageMeta({ title: `${t(locale, 'nav.articles')} | ArtNiyyətli`, description: t(locale, 'articles.description') });

    return (
        <div className="px-page pb-step-9 font-ui">
            {/* Label "Məqalələr" over the "Jurnal" title: not the same word twice. */}
            <PageHeader label={t(locale, 'labels.articles')} title={t(locale, 'nav.articles')} description={t(locale, 'articles.description')} />

            {loading && !data && (
                <div aria-busy="true" data-testid="articles-skeleton">
                    {Array.from({ length: 3 }, (_, i) => (
                        <div key={i} aria-hidden="true" className="flex flex-col gap-step-2 border-b border-line py-step-5">
                            <div className="h-3 w-1/5 bg-surface-field" />
                            <div className="h-6 w-1/2 bg-surface-field" />
                            <div className="h-4 w-2/3 bg-surface-field" />
                        </div>
                    ))}
                </div>
            )}
            {error && <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />}
            {!error && data?.length === 0 && <p className="mt-step-7 text-ui text-ink-muted">{t(locale, 'articles.empty')}</p>}
            {!error && data?.length > 0 && (
                <>
                    <ul>
                        {data.map((article) => (
                            <li key={article.slug} className="border-b border-line">
                                <ArticleCard article={article} />
                            </li>
                        ))}
                    </ul>
                    <Pagination meta={meta} onPageChange={setPage} />
                </>
            )}
        </div>
    );
}
