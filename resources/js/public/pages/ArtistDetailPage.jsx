import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { seoMeta } from '../lib/seoMeta.js';
import { excerpt } from '../lib/text.js';
import { formatDimensions } from '../lib/format.js';
import { buttonClass } from '../lib/buttons.js';
import { getArtist } from '../services/artists.js';
import HomeWall from '../components/HomeWall.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundState from '../components/NotFoundState.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import WineCallout from '../components/WineCallout.jsx';
import Monogram from '../components/Monogram.jsx';
import Emphasis, { plainText } from '../components/Emphasis.jsx';
import { ArtworkCaption } from '../components/ArtworkCard.jsx';

const SECTION_PAD = 'py-[clamp(80px,9.72vw,140px)]';

/** The first sentence of a text and the rest: the approach's first sentence is the quote, the rest is read after the biography. */
export function splitFirstSentence(text) {
    const clean = String(text ?? '').trim();
    const match = /^(.+?[.!?…])(\s+|$)([\s\S]*)$/.exec(clean);

    return match ? { first: match[1], rest: match[3].trim() } : { first: clean, rest: '' };
}

/** Exhibitions and awards as one list, newest first; an award's place reads "Mükafat". */
export function historyRows(data, locale) {
    const rows = [
        ...(Array.isArray(data.exhibitions) ? data.exhibitions : []).map((row) => ({ ...row, kind: 'exhibition' })),
        ...(Array.isArray(data.awards) ? data.awards : []).map((row) => ({ ...row, venue: row.venue || t(locale, 'pages.artist.award'), kind: 'award' })),
    ].filter((row) => row.title);

    return rows.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
}

function Skeleton() {
    return (
        <div aria-busy="true" data-testid="artist-skeleton">
            <div aria-hidden="true" className="flex items-end gap-step-6 bg-wine px-page py-[88px]">
                <div className="h-[240px] w-[200px] bg-wine-deep" />
                <div className="flex flex-1 flex-col gap-step-3">
                    <div className="h-12 w-1/2 bg-wine-deep" />
                    <div className="h-4 w-1/3 bg-wine-deep" />
                </div>
            </div>
        </div>
    );
}

/**
 * An artist (krem-bordo), in the existing order: the header band (portrait or initials, "Rəssam", the name with the
 * surname emphasised, "direction · year, place", "Əsərlərə bax" and "Rəssam haqqında sorğu"); 01 the works hung on the
 * wall at true size next to the 170 cm figure, on surface-sunk, with the list of their names; 02 the artistic approach
 * (its first sentence as a quote) and the biography; 03 exhibitions and awards; the closing wine band. A section
 * without data is left out and the numbers close up. No Signal on the page.
 */
export default function ArtistDetailPage({ params }) {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getArtist(locale, params.slug), [locale, params.slug, retryToken]);

    const name = data ? [data.first_name, data.last_name].filter(Boolean).join(' ') : '';
    const meta = data ? seoMeta(data, { title: name, description: excerpt(data.biography) || undefined }) : null;
    usePageMeta(meta ? { ...meta, og: { title: meta.title, description: meta.description, image: data.seo?.image_url ?? data.portrait_url ?? undefined } } : {});

    if (loading && !data) return <Skeleton />;
    if (error?.status === 404) {
        return <NotFoundState title={t(locale, 'artist.notFoundTitle')} body={t(locale, 'artist.notFoundBody')} links={[{ href: '/artists', label: t(locale, 'artist.backToArtists') }]} />;
    }
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const born = [data.birth_year, data.birth_place].filter(Boolean).join(', ');
    const line = [data.direction, born].filter(Boolean).join(' · ');
    const artworks = Array.isArray(data.artworks) ? data.artworks : [];
    const history = historyRows(data, locale);
    const approach = splitFirstSentence(data.artistic_approach);
    const reading = [data.biography, approach.rest].filter(Boolean);
    const title = data.first_name && data.last_name ? `${data.first_name} *${data.last_name}*` : name;
    const catalogueHref = data.id != null ? `/artworks?artist=${encodeURIComponent(data.id)}` : '/artworks';

    let counter = 0;
    const next = () => String(++counter).padStart(2, '0');

    return (
        <article className="font-ui" key={data.slug}>
            <div data-surface="wine" className="bg-wine px-page pt-[clamp(56px,6.1vw,88px)] pb-[clamp(56px,5.8vw,84px)] text-surface" data-testid="artist-header">
                <div className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] items-center gap-step-5 md:grid-cols-[200px_minmax(0,1fr)_auto] md:gap-step-8">
                    <div className="aspect-[5/6] w-full md:w-[200px]" data-testid="artist-portrait">
                        {data.portrait_url ? (
                            <img src={data.portrait_url} alt={name} loading="eager" decoding="async" className="h-full w-full object-cover" />
                        ) : (
                            <span className="flex h-full w-full items-center justify-center bg-wine-deep">
                                <Monogram name={name} className="text-[44px] text-wine-accent md:text-[84px]" />
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="mb-step-3 text-[13px] font-semibold text-wine-muted max-md:text-[14px]">{t(locale, 'pages.artist.label')}</p>
                        <h1 className="text-banner text-surface">
                            <Emphasis text={title} />
                        </h1>
                        {line && <p className="figures mt-step-4 font-editorial text-[17px] text-wine-muted md:text-[19px]">{line}</p>}
                    </div>
                    <div className="col-span-2 flex flex-wrap gap-step-3 md:col-span-1 md:flex-col md:items-stretch">
                        {artworks.length > 0 && <a href="#artist-works" className={buttonClass('primary', 'wine')}>{t(locale, 'pages.artist.seeWorks')}</a>}
                        <a href="/contact" className={buttonClass('secondary', 'wine')}>{t(locale, 'pages.artist.enquire')}</a>
                    </div>
                </div>
            </div>

            {artworks.length > 0 && (
                <section aria-labelledby="artist-works" className={`scroll-mt-20 px-page ${SECTION_PAD}`}>
                    <SectionHeading id="artist-works" number={next()} divider link={{ href: catalogueHref, label: t(locale, 'pages.artist.inCatalogue') }}>
                        {t(locale, 'pages.artist.worksTitle')}
                    </SectionHeading>
                    <div className="mt-step-7 bg-surface-sunk px-step-5 pt-step-7 pb-step-5 md:px-step-8 md:pt-step-8" data-testid="artist-wall">
                        <HomeWall artworks={artworks} label={t(locale, 'artist.wallLabel')} note={t(locale, 'pages.artist.worksMeta').replace('{n}', artworks.length)} />
                    </div>
                    <ul className="mt-step-7 grid grid-cols-1 gap-step-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="artist-work-list">
                        {artworks.map((work) => (
                            <li key={work.inventory_code}>
                                <a href={`/artworks/${encodeURIComponent(work.inventory_code)}`} className="group block">
                                    <ArtworkCaption artwork={{ ...work, artist: null }} dims={formatDimensions(work.width_cm, work.height_cm, locale)} />
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {(approach.first || reading.length > 0) && (
                <section aria-labelledby="artist-approach" className={`border-t border-line px-page ${SECTION_PAD}`} data-testid="artist-texts">
                    <div className="grid grid-cols-1 gap-step-7 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-step-9">
                        <div className="min-w-0">
                            <h2 id="artist-approach" className="text-[13px] font-semibold text-wine max-md:text-[14px]">
                                {next()} · {t(locale, approach.first ? 'pages.artist.approachTitle' : 'artist.biography')}
                            </h2>
                            {approach.first && (
                                <blockquote className="mt-step-5 font-editorial text-[clamp(28px,2.7vw,38px)] leading-[1.3] text-wine italic" data-testid="artist-quote">
                                    “{approach.first}”
                                </blockquote>
                            )}
                        </div>
                        <div className="min-w-0 max-w-prose">
                            {reading.map((text, index) => (
                                <p key={index} className={`font-editorial text-[17px] leading-[1.7] whitespace-pre-line text-ink md:text-[19px] ${index > 0 ? 'mt-step-5' : ''}`}>{text}</p>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {history.length > 0 && (
                <section aria-labelledby="artist-history" className={`px-page ${SECTION_PAD} ${artworks.length > 0 || approach.first ? 'pt-0' : ''}`}>
                    <SectionHeading id="artist-history" number={next()} divider>{t(locale, 'pages.artist.historyTitle')}</SectionHeading>
                    <ul data-testid="artist-history-list">
                        {history.map((row, index) => (
                            <li key={index} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-step-5 gap-y-step-1 border-b border-line py-step-5 md:grid-cols-[7rem_minmax(0,1fr)_auto] md:items-baseline">
                                <span className="figures text-[15px] font-semibold text-wine">{row.year}</span>
                                <span className="font-editorial text-[18px] leading-[1.35] text-ink italic md:text-[20px]">{plainText(row.title)}</span>
                                {row.venue && <span className="col-start-2 text-[14px] text-ink-muted md:col-start-auto md:text-right">{row.venue}</span>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <WineCallout
                id="artist-callout"
                title={t(locale, 'pages.artist.calloutTitle')}
                text={t(locale, 'pages.artist.calloutText')}
                action={{ href: '/contact', label: t(locale, 'pages.artist.calloutButton') }}
            />
        </article>
    );
}
