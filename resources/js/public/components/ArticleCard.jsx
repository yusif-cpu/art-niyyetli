import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { formatDate } from '../lib/format.js';
import Emphasis, { plainText } from './Emphasis.jsx';

/** The label of an article type (E11 `type`); an unknown value shows nothing rather than a dictionary path. */
export function articleType(locale, type) {
    const path = `articles.types.${type}`;
    const label = type ? t(locale, path) : null;

    return label && label !== path ? label : null;
}

/** The article's cover: the first media item with a URL, or null. */
export function articleCover(article) {
    return Array.isArray(article?.media) ? article.media.find((m) => m.url)?.url ?? null : null;
}

/**
 * "MÜSAHİBƏ · 22 oktyabr 2026": the type in capitals and the date, 12px 600 wine — the line above an article's title.
 * Either part may be missing.
 */
export function ArticleMeta({ article, className = '' }) {
    const { locale } = useLocale();
    const type = articleType(locale, article.type);
    const date = formatDate(article.published_at, locale);
    if (!type && !date) return null;

    return (
        <p className={`figures text-label font-semibold text-wine ${className}`}>
            {/* toLocaleUpperCase, not CSS uppercase: "Bələdçi" must become "BƏLƏDÇİ" (az dotted İ). */}
            {type && type.toLocaleUpperCase(locale === 'az' ? 'az' : 'en')}
            {type && date && ' · '}
            {date}
        </p>
    );
}

/**
 * One article as a card, the whole card a link: the cover 260px tall (cover-fit; none without a cover — no empty
 * box), the type and date, the title (`size` "lg" 24px for the home page, else 22px; 600, wine), and the short text
 * in Spectral 16px ink-muted when `withText`.
 */
export default function ArticleCard({ article, size = 'md', withText = true }) {
    const cover = articleCover(article);

    return (
        <a href={`/articles/${encodeURIComponent(article.slug)}`} className="group flex flex-col text-ink" data-testid="article-card">
            {cover && (
                <span className="mb-step-5 block h-[220px] overflow-hidden bg-surface-sunk md:h-[260px]">
                    <img src={cover} alt={plainText(article.title)} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </span>
            )}
            <ArticleMeta article={article} />
            <span className={`mt-step-2 block font-semibold tracking-[-0.015em] text-wine decoration-1 underline-offset-4 group-hover:underline ${size === 'lg' ? 'text-[24px] leading-[1.2]' : 'text-[22px] leading-[1.22]'}`}>
                <Emphasis text={article.title} />
            </span>
            {withText && article.short_text && <span className="mt-step-3 block font-editorial text-[16px] leading-[1.55] text-ink-muted">{article.short_text}</span>}
        </a>
    );
}
