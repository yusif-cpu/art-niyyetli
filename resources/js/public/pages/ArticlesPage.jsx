import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { buttonClass } from '../lib/buttons.js';
import { listArticles } from '../services/articles.js';
import ArticleCard, { ArticleMeta, articleCover, articleType } from '../components/ArticleCard.jsx';
import Pagination from '../components/Pagination.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Emphasis from '../components/Emphasis.jsx';

/** The newest article as the large card: the cover 560px tall on the left (1.25fr), the text on the right (1fr). */
function LeadArticle({ article, locale }) {
    const cover = articleCover(article);
    const href = `/articles/${encodeURIComponent(article.slug)}`;

    return (
        <article className={`grid grid-cols-1 gap-step-6 ${cover ? 'md:grid-cols-[1.25fr_1fr] md:items-center md:gap-step-9' : ''}`} data-testid="lead-article">
            {cover && (
                <a href={href} tabIndex={-1} aria-hidden="true" className="block h-[60vw] overflow-hidden bg-surface-sunk shadow-present md:h-[560px]">
                    <img src={cover} alt="" loading="eager" decoding="async" className="h-full w-full object-cover" />
                </a>
            )}
            <div className="min-w-0">
                <ArticleMeta article={article} />
                <h2 className="mt-step-4 text-[clamp(34px,3.5vw,50px)] leading-[1.06] font-bold tracking-[-0.03em] text-wine">
                    <a href={href} className="decoration-2 underline-offset-[6px] hover:underline"><Emphasis text={article.title} /></a>
                </h2>
                {article.short_text && <p className="mt-step-5 font-editorial text-[18px] leading-[1.6] text-ink-muted md:text-[20px]">{article.short_text}</p>}
                <a href={href} className={`mt-step-6 ${buttonClass('primary', 'cream')}`}>{t(locale, 'pages.journal.read')}</a>
            </div>
        </article>
    );
}

/**
 * The journal (krem-bordo): the wine header band, the type chips ("Hamısı" and every type the loaded articles carry —
 * the list endpoint takes no type filter, E11, so the chips filter the loaded page), the newest article as a large
 * card, and the rest in a four-column grid of cards. Pages as before.
 */
export default function ArticlesPage() {
    const { locale } = useLocale();
    const [page, setPage] = useState(1);
    const [type, setType] = useState(null);
    const [retryToken, setRetryToken] = useState(0);
    const { data, meta, loading, error } = useApiData(() => listArticles(locale, page > 1 ? { page } : undefined), [locale, page, retryToken]);

    usePageMeta({ title: `${t(locale, 'nav.articles')} | ArtNiyyətli`, description: t(locale, 'pages.journal.description') });

    const all = Array.isArray(data) ? data : [];
    const types = [...new Set(all.map((article) => article.type).filter((key) => articleType(locale, key)))];
    const chosen = types.includes(type) ? type : null;
    const shown = chosen ? all.filter((article) => article.type === chosen) : all;
    const [lead, ...rest] = shown;
    const total = typeof meta?.total === 'number' ? meta.total : all.length;
    const chip = (selected) =>
        `inline-flex min-h-11 cursor-pointer items-center border px-[22px] text-[14px] leading-[1.2] font-medium whitespace-nowrap transition-colors duration-150 ${selected ? 'border-wine bg-wine text-surface' : 'border-line text-ink hover:border-wine'}`;

    return (
        <div className="font-ui">
            <PageHeader label={t(locale, 'labels.journal')} title={t(locale, 'pages.journal.title')} description={t(locale, 'pages.journal.description')} />

            {types.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-step-4 border-b border-line px-page py-step-5">
                    <div role="group" aria-label={t(locale, 'pages.journal.types')} className="flex flex-wrap gap-step-2" data-testid="article-types">
                        <button type="button" aria-pressed={!chosen} onClick={() => setType(null)} className={chip(!chosen)}>{t(locale, 'filters.all')}</button>
                        {types.map((key) => (
                            <button key={key} type="button" aria-pressed={chosen === key} onClick={() => setType(chosen === key ? null : key)} className={chip(chosen === key)}>
                                {articleType(locale, key)}
                            </button>
                        ))}
                    </div>
                    <p className="figures text-meta text-ink-muted">{t(locale, 'pages.journal.count').replace('{n}', total)}</p>
                </div>
            )}

            <div className="px-page py-[clamp(64px,7vw,100px)]">
                {loading && !data && (
                    <div aria-busy="true" data-testid="articles-skeleton">
                        <div aria-hidden="true" className="grid grid-cols-1 gap-step-6 md:grid-cols-[1.25fr_1fr]">
                            <div className="h-[320px] bg-surface-sunk md:h-[560px]" />
                            <div className="flex flex-col gap-step-3">
                                <div className="h-3 w-1/4 bg-surface-sunk" />
                                <div className="h-12 w-3/4 bg-surface-sunk" />
                            </div>
                        </div>
                    </div>
                )}
                {error && <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />}
                {!error && data?.length === 0 && <p className="text-ui text-ink-muted">{t(locale, 'articles.empty')}</p>}
                {!error && lead && (
                    <>
                        <LeadArticle article={lead} locale={locale} />
                        {rest.length > 0 && (
                            <ul className="mt-[clamp(64px,7vw,100px)] grid grid-cols-1 gap-x-step-6 gap-y-step-8 border-t border-line pt-[clamp(64px,7vw,100px)] sm:grid-cols-2 lg:grid-cols-4" data-testid="article-grid">
                                {rest.map((article) => (
                                    <li key={article.slug}>
                                        <ArticleCard article={article} />
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Pagination meta={meta} onPageChange={setPage} />
                    </>
                )}
            </div>
        </div>
    );
}
