import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { seoMeta } from '../lib/seoMeta.js';
import { excerpt } from '../lib/text.js';
import { formatDate } from '../lib/format.js';
import { getArticle, listArticles } from '../services/articles.js';
import ArticleCard, { articleCover, articleType } from '../components/ArticleCard.jsx';
import YoutubeEmbed from '../components/YoutubeEmbed.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundState from '../components/NotFoundState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SectionHeading from '../components/SectionHeading.jsx';

const MORE_ARTICLES = 3;
const WORDS_PER_MINUTE = 200;

/** Minutes to read plain text at 200 words a minute, rounded up; null without text. */
export function readingMinutes(text) {
    const words = String(text ?? '').trim().split(/\s+/).filter(Boolean).length;

    return words > 0 ? Math.ceil(words / WORDS_PER_MINUTE) : null;
}

function Skeleton() {
    return (
        <div aria-busy="true" data-testid="article-skeleton">
            <div aria-hidden="true" className="flex flex-col gap-step-3 bg-wine px-page py-[88px]">
                <div className="h-3 w-1/4 bg-wine-deep" />
                <div className="h-14 w-3/4 bg-wine-deep" />
                <div className="h-4 w-1/2 bg-wine-deep" />
            </div>
        </div>
    );
}

/**
 * An article (krem-bordo): the wine header band — "type · date · reading time" (200 words a minute), the title, the
 * short text — with the cover inside the band, 72px from the edges, 600px tall; the video; the text in a 760px column
 * (plain authored text, never HTML: paragraphs only), its first paragraph the 24px lead; and "Digər *məqalələr*", three
 * cards.
 */
export default function ArticleDetailPage({ params }) {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getArticle(locale, params.slug), [locale, params.slug, retryToken]);
    // One more than shown, so the current article can be dropped from the list.
    const others = useApiData(() => listArticles(locale, { per_page: MORE_ARTICLES + 1 }), [locale]);

    const cover = articleCover(data);
    const meta = data ? seoMeta(data, { title: data.title, description: data.short_text || excerpt(data.content) || undefined }) : null;
    usePageMeta(meta ? { ...meta, og: { title: meta.title, description: meta.description, image: data.seo?.image_url ?? cover ?? undefined } } : {});

    if (loading && !data) return <Skeleton />;
    if (error?.status === 404) {
        return <NotFoundState title={t(locale, 'articles.notFoundTitle')} body={t(locale, 'articles.notFoundBody')} links={[{ href: '/articles', label: t(locale, 'articles.backToList') }]} />;
    }
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const more = Array.isArray(others.data) ? others.data.filter((a) => a.slug !== data.slug).slice(0, MORE_ARTICLES) : [];
    const minutes = readingMinutes(data.content);
    const label = [articleType(locale, data.type), formatDate(data.published_at, locale), minutes && t(locale, 'pages.journal.readingTime').replace('{n}', minutes)].filter(Boolean).join(' · ');
    const paragraphs = String(data.content ?? '').split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);

    return (
        <div className="font-ui" key={data.slug}>
            <article>
                <PageHeader label={label} title={data.title} description={data.short_text}>
                    {cover && (
                        <div className="px-page">
                            <img src={cover} alt={data.title} loading="eager" fetchPriority="high" decoding="async" className="block h-[56vw] w-full object-cover md:h-[600px]" data-testid="article-cover" />
                        </div>
                    )}
                </PageHeader>

                <div className="px-page py-[clamp(64px,7vw,100px)]">
                    <div className="mx-auto max-w-[760px]" data-testid="article-body">
                        {data.video && (
                            <div className="mb-step-8">
                                <YoutubeEmbed video={data.video} title={data.title} />
                            </div>
                        )}
                        {paragraphs.map((text, index) => (
                            <p
                                key={index}
                                className={index === 0 ? 'font-editorial text-[21px] leading-[1.6] text-ink md:text-[24px]' : 'mt-step-5 font-editorial text-[17px] leading-[1.75] text-ink md:text-[19px]'}
                            >
                                {text}
                            </p>
                        ))}
                    </div>
                </div>
            </article>

            {more.length > 0 && (
                <section aria-labelledby="article-more" className="border-t border-line px-page py-[clamp(80px,9.72vw,140px)]">
                    <SectionHeading id="article-more" divider link={{ href: '/articles', label: t(locale, 'articles.backToList') }}>
                        {t(locale, 'pages.journal.moreTitle')}
                    </SectionHeading>
                    <ul className="mt-step-7 grid grid-cols-1 gap-step-8 md:grid-cols-3 md:gap-step-6">
                        {more.map((article) => (
                            <li key={article.slug}>
                                <ArticleCard article={article} size="lg" withText={false} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
