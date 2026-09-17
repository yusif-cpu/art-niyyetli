import { useLocale } from '../i18n/LocaleContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { getPage } from '../services/pages.js';
import ImageWithFallback from '../components/ImageWithFallback.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundPage from './NotFoundPage.jsx';

export default function StaticPage({ params }) {
    const { locale } = useLocale();
    const { data, loading, error } = useApiData(() => getPage(locale, params.slug), [locale, params.slug]);

    if (loading) return <LoadingState />;
    if (error?.status === 404) return <NotFoundPage />;
    if (error) return <ErrorState error={error} />;

    return (
        <div className="mx-auto max-w-2xl px-6 py-8">
            <h1 className="text-2xl font-semibold">{data.title}</h1>
            <p className="mt-4 whitespace-pre-wrap">{data.content}</p>

            {data.sections?.map((section) => (
                <section key={section.key} className="mt-8">
                    {section.image_url && <ImageWithFallback src={section.image_url} alt={section.heading} className="mb-4 w-full object-cover" />}
                    <h2 className="text-lg font-semibold">{section.heading}</h2>
                    <p className="mt-2 whitespace-pre-wrap">{section.body}</p>
                </section>
            ))}
        </div>
    );
}
