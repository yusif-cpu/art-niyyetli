import { useLocale } from '../i18n/LocaleContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { getArticle } from '../services/articles.js';
import ImageWithFallback from '../components/ImageWithFallback.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundPage from './NotFoundPage.jsx';

export default function ArticleDetailPage({ params }) {
    const { locale } = useLocale();
    const { data, loading, error } = useApiData(() => getArticle(locale, params.slug), [locale, params.slug]);

    if (loading) return <LoadingState />;
    if (error?.status === 404) return <NotFoundPage />;
    if (error) return <ErrorState error={error} />;

    return (
        <div className="mx-auto max-w-2xl px-6 py-8">
            <h1 className="text-2xl font-semibold">{data.title}</h1>
            <p className="text-sm text-neutral-500">{new Date(data.published_at).toLocaleDateString(locale)}</p>

            {data.media.length > 0 && (
                <ImageWithFallback src={data.media[0].url} alt={data.title} className="mt-4 aspect-video w-full object-cover" />
            )}

            {/* content is opaque authored text, never HTML — rendered as plain text per the API guide's explicit warning */}
            <p className="mt-6 whitespace-pre-wrap">{data.content}</p>
        </div>
    );
}
