import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { formatDate } from '../lib/format.js';

/** The label of an article type (E11 `type`); an unknown value shows nothing rather than a dictionary path. */
export function articleType(locale, type) {
    const path = `articles.types.${type}`;
    const label = type ? t(locale, path) : null;

    return label && label !== path ? label : null;
}

/** "10 sentyabr 2026 · Müsahibə": the date and the type, the line above an article's title. */
export function ArticleMeta({ article, className = '' }) {
    const { locale } = useLocale();
    const parts = [formatDate(article.published_at, locale), articleType(locale, article.type)].filter(Boolean);
    if (parts.length === 0) return null;

    return <p className={`figures text-caption text-ink-muted ${className}`}>{parts.join(' · ')}</p>;
}

/**
 * One article in a list, the whole item a link: date and type, the title (Spectral), the short text, and the cover
 * (the first media image) at the side when there is one — a 4:3 field with a 1px line, no shadow.
 */
export default function ArticleCard({ article }) {
    const cover = article.media?.find((m) => m.url)?.url ?? null;

    return (
        <a href={`/articles/${encodeURIComponent(article.slug)}`} className={`group grid gap-step-4 py-step-5 text-ink ${cover ? 'md:grid-cols-[minmax(0,1fr)_16rem] md:gap-step-6' : ''}`}>
            <span className="flex flex-col gap-step-2">
                <ArticleMeta article={article} />
                <span className="font-editorial text-title decoration-1 underline-offset-2 group-hover:underline">{article.title}</span>
                {article.short_text && <span className="max-w-prose font-editorial text-reading-sm text-ink-muted">{article.short_text}</span>}
            </span>
            {cover && (
                <span className="block aspect-[4/3] overflow-hidden border border-line bg-surface-field md:row-start-1 md:col-start-2">
                    <img src={cover} alt={article.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </span>
            )}
        </a>
    );
}
