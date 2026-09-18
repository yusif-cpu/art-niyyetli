import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { listArticles } from '../services/articles.js';
import ArticleCard from '../components/ArticleCard.jsx';
import Pagination from '../components/Pagination.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function ArticlesPage() {
    const { locale } = useLocale();
    const [page, setPage] = useState(1);
    const { data, meta, loading, error } = useApiData(() => listArticles(locale, { page }), [locale, page]);

    usePageMeta({ title: `${t(locale, 'nav.articles')} — ArtNiyyətli` });

    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;
    if (data.length === 0) return <EmptyState />;

    return (
        <div className="px-6 py-8">
            <h1 className="mb-6 text-2xl font-semibold">{t(locale, 'nav.articles')}</h1>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.map((article) => <ArticleCard key={article.slug} article={article} />)}
            </div>
            <Pagination meta={meta} onPageChange={setPage} />
        </div>
    );
}
