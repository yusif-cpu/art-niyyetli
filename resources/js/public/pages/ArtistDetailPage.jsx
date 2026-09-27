import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { seoMeta } from '../lib/seoMeta.js';
import { excerpt } from '../lib/text.js';
import { getArtist } from '../services/artists.js';
import ArtistPortrait from '../components/ArtistPortrait.jsx';
import HomeWall from '../components/HomeWall.jsx';
import ErrorState from '../components/ErrorState.jsx';

function Skeleton() {
    return (
        <div className="px-page pt-step-8 pb-step-9" aria-busy="true" data-testid="artist-skeleton">
            <div aria-hidden="true" className="grid gap-step-7 md:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)]">
                <div className="aspect-[4/5] w-full max-w-70 border border-line bg-surface-field" />
                <div className="flex flex-col gap-step-3">
                    <div className="h-8 w-1/2 bg-surface-field" />
                    <div className="h-4 w-1/3 bg-surface-field" />
                </div>
            </div>
        </div>
    );
}

function NotFound({ locale }) {
    usePageMeta({ title: `${t(locale, 'artist.notFoundTitle')} — ArtNiyyətli`, noIndex: true });

    return (
        <div className="px-page pt-step-8 pb-step-9 font-ui">
            <h1 className="text-display">{t(locale, 'artist.notFoundTitle')}</h1>
            <p className="mt-step-4 text-ui text-ink-muted">{t(locale, 'artist.notFoundBody')}</p>
            <a href="/artists" className="mt-step-5 inline-block text-ui text-ink underline decoration-1 underline-offset-2">
                {t(locale, 'artist.backToArtists')}
            </a>
        </div>
    );
}

/** Year + title (+ venue) rows between hairlines — the exhibition history and the awards. */
function History({ id, title, rows }) {
    if (rows.length === 0) return null;

    return (
        <section aria-labelledby={id}>
            <h2 id={id} className="mb-step-4 text-subheading">{title}</h2>
            <ul className="border-t border-line">
                {rows.map((row, index) => (
                    <li key={index} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-step-4 border-b border-line py-step-3 md:grid-cols-[4rem_minmax(0,2fr)_minmax(0,1fr)]">
                        <span className="figures text-meta text-ink-muted">{row.year}</span>
                        <span className="text-ui">{row.title}</span>
                        {row.venue && <span className="col-start-2 text-meta text-ink-muted md:col-start-auto">{row.venue}</span>}
                    </li>
                ))}
            </ul>
        </section>
    );
}

/**
 * An artist: portrait and name block, biography and artistic approach (reading text), the works hung on a wall at
 * true size next to the 170 cm figure (the same wall as the home page — comparing one artist's large and small works
 * is where true size matters most), the exhibition history and awards, and an enquiry link. No Signal on the page.
 */
export default function ArtistDetailPage({ params }) {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getArtist(locale, params.slug), [locale, params.slug, retryToken]);

    const name = data ? [data.first_name, data.last_name].filter(Boolean).join(' ') : '';
    const meta = data ? seoMeta(data, { title: name, description: excerpt(data.biography) || undefined }) : null;
    usePageMeta(meta ? { ...meta, og: { title: meta.title, description: meta.description, image: data.seo?.image_url ?? data.portrait_url ?? undefined } } : {});

    if (loading && !data) return <Skeleton />;
    if (error?.status === 404) return <NotFound locale={locale} />;
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const born = [data.birth_year, data.birth_place].filter(Boolean).join(', ');
    const artworks = Array.isArray(data.artworks) ? data.artworks : [];
    const exhibitions = Array.isArray(data.exhibitions) ? data.exhibitions : [];
    const awards = Array.isArray(data.awards) ? data.awards : [];
    const summary = excerpt(data.artistic_approach, 140);

    return (
        <article className="flex flex-col gap-step-9 px-page pt-step-8 pb-step-9 font-ui" key={data.slug}>
            <header className="grid gap-step-7 md:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] md:items-end">
                <ArtistPortrait artist={data} className="w-full max-w-70" priority />
                <div>
                    <h1 className="text-heading">{name}</h1>
                    {data.direction && <p className="mt-step-2 text-ui">{data.direction}</p>}
                    {born && <p className="figures mt-step-1 text-meta text-ink-muted">{born}</p>}
                    {summary && <p className="mt-step-4 max-w-prose font-editorial text-reading-sm text-ink-muted">{summary}</p>}
                </div>
            </header>

            {(data.biography || data.artistic_approach) && (
                <section aria-label={t(locale, 'artist.biography')} className="flex max-w-prose flex-col gap-step-6">
                    {data.biography && (
                        <div>
                            <h2 className="mb-step-3 text-subheading">{t(locale, 'artist.biography')}</h2>
                            <p className="font-editorial text-reading whitespace-pre-line">{data.biography}</p>
                        </div>
                    )}
                    {data.artistic_approach && (
                        <div>
                            <h2 className="mb-step-3 text-subheading">{t(locale, 'artist.approach')}</h2>
                            <p className="font-editorial text-reading whitespace-pre-line">{data.artistic_approach}</p>
                        </div>
                    )}
                </section>
            )}

            {artworks.length > 0 && (
                <section aria-labelledby="artist-works">
                    <h2 id="artist-works" className="mb-step-5 text-subheading">{t(locale, 'artist.works')}</h2>
                    <HomeWall artworks={artworks} label={t(locale, 'artist.wallLabel')} />
                </section>
            )}

            <History id="artist-exhibitions" title={t(locale, 'artist.exhibitionHistory')} rows={exhibitions} />
            <History id="artist-awards" title={t(locale, 'artist.awards')} rows={awards} />

            <div>
                <a href="/contact" className="inline-block bg-wine px-step-5 py-step-3 text-ui text-wine-ink">
                    {t(locale, 'artist.enquire')}
                </a>
            </div>
        </article>
    );
}
