import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { seoMeta } from '../lib/seoMeta.js';
import { excerpt } from '../lib/text.js';
import { getArticle, listArticles } from '../services/articles.js';
import ArticleCard, { ArticleMeta } from '../components/ArticleCard.jsx';
import YoutubeEmbed from '../components/YoutubeEmbed.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundState from '../components/NotFoundState.jsx';

const MORE_ARTICLES = 3;

function Skeleton() {
    return (
        <div className="px-page pt-step-8 pb-step-9" aria-busy="true" data-testid="article-skeleton">
            <div aria-hidden="true" className="flex max-w-prose flex-col gap-step-3">
                <div className="h-3 w-1/4 bg-surface-field" />
                <div className="h-8 w-3/4 bg-surface-field" />
                <div className="mt-step-4 h-4 w-full bg-surface-field" />
                <div className="h-4 w-5/6 bg-surface-field" />
            </div>
        </div>
    );
}

/**
 * An article: date and type, the title in Spectral, the cover across the text column (no shadow — it is not a hung
 * work), the video, the text (plain authored text, never HTML — the API guide says so; line breaks kept), and at the
 * end up to three other articles.
 */
export default function ArticleDetailPage({ params }) {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getArticle(locale, params.slug), [locale, params.slug, retryToken]);
    // One more than shown, so the current article can be dropped from the list.
    const others = useApiData(() => listArticles(locale, { per_page: MORE_ARTICLES + 1 }), [locale]);

    const cover = Array.isArray(data?.media) ? data.media.find((m) => m.url)?.url ?? null : null;
    const meta = data ? seoMeta(data, { title: data.title, description: data.short_text || excerpt(data.content) || undefined }) : null;
    usePageMeta(meta ? { ...meta, og: { title: meta.title, description: meta.description, image: data.seo?.image_url ?? cover ?? undefined } } : {});

    if (loading && !data) return <Skeleton />;
    if (error?.status === 404) {
        return <NotFoundState title={t(locale, 'articles.notFoundTitle')} body={t(locale, 'articles.notFoundBody')} links={[{ href: '/articles', label: t(locale, 'articles.backToList') }]} />;
    }
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const more = Array.isArray(others.data) ? others.data.filter((a) => a.slug !== data.slug).slice(0, MORE_ARTICLES) : [];

    return (
        <div className="flex flex-col gap-step-9 px-page pt-step-8 pb-step-9 font-ui" key={data.slug}>
            <article className="flex max-w-prose flex-col gap-step-6">
                <header className="flex flex-col gap-step-3">
                    <ArticleMeta article={data} />
                    <h1 className="font-editorial text-heading">{data.title}</h1>
                </header>

                {cover && (
                    <div className="aspect-[3/2] w-full overflow-hidden border border-line bg-surface-field">
                        <img src={cover} alt={data.title} loading="eager" fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
                    </div>
                )}

                {data.video && <YoutubeEmbed video={data.video} title={data.title} />}

                {data.content && <p className="font-editorial text-reading whitespace-pre-line">{data.content}</p>}
            </article>

            {more.length > 0 && (
                <section aria-labelledby="article-more" className="border-t border-line pt-step-6">
                    <h2 id="article-more" className="text-subheading">{t(locale, 'articles.more')}</h2>
                    <ul>
                        {more.map((article) => (
                            <li key={article.slug} className="border-b border-line">
                                <ArticleCard article={article} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
