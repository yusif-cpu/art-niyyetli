import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { seoMeta } from '../lib/seoMeta.js';
import { excerpt } from '../lib/text.js';
import { formatDateRange } from '../lib/format.js';
import { getExhibition } from '../services/exhibitions.js';
import ArtistCard from '../components/ArtistCard.jsx';
import { artworkFor, worksBy } from '../lib/artists.js';
import HomeWall from '../components/HomeWall.jsx';
import YoutubeEmbed from '../components/YoutubeEmbed.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundState from '../components/NotFoundState.jsx';
import { ExhibitionStatus } from '../components/ExhibitionRow.jsx';

function Skeleton() {
    return (
        <div className="px-page pt-step-8 pb-step-9" aria-busy="true" data-testid="exhibition-skeleton">
            <div aria-hidden="true" className="flex flex-col gap-step-3">
                <div className="h-8 w-1/2 bg-surface-field" />
                <div className="h-4 w-1/3 bg-surface-field" />
                <div className="mt-step-6 h-64 w-full border border-line bg-surface-field" />
            </div>
        </div>
    );
}

/**
 * An exhibition: title, dates, venue and status; the text; the works in the show hung on the wall at true size (an
 * exhibition *is* works on a wall — the home wall component, one k, the 170 cm figure); the participating artists;
 * the photos (a plain grid, no lightbox) and the video; an enquiry link. No Signal on the page.
 */
export default function ExhibitionDetailPage({ params }) {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getExhibition(locale, params.slug), [locale, params.slug, retryToken]);

    const photos = Array.isArray(data?.media) ? data.media.filter((m) => m.type === 'photo' && m.url) : [];
    const meta = data ? seoMeta(data, { title: data.title, description: data.short_text || excerpt(data.full_text) || undefined }) : null;
    usePageMeta(meta ? { ...meta, og: { title: meta.title, description: meta.description, image: data.seo?.image_url ?? photos[0]?.url ?? undefined } } : {});

    if (loading && !data) return <Skeleton />;
    if (error?.status === 404) {
        return <NotFoundState title={t(locale, 'exhibitions.notFoundTitle')} body={t(locale, 'exhibitions.notFoundBody')} links={[{ href: '/exhibitions', label: t(locale, 'exhibitions.backToList') }]} />;
    }
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const dates = formatDateRange(data.start_date, data.end_date, locale);
    const text = data.full_text || data.short_text;
    const artworks = Array.isArray(data.artworks) ? data.artworks : [];
    const artists = Array.isArray(data.artists) ? data.artists.filter((a) => a.name) : [];

    return (
        <article className="flex flex-col gap-step-9 px-page pt-step-8 pb-step-9 font-ui" key={data.slug}>
            {/* Title, dates, venue, status and the text read as one block: step-4 inside, step-9 only between sections. */}
            <div className="flex flex-col gap-step-4" data-testid="exhibition-intro">
                <header>
                    <h1 className="text-heading">{data.title}</h1>
                    <div className="mt-step-3 flex flex-wrap items-baseline gap-x-step-5 gap-y-step-2">
                        {dates && <span className="figures text-meta text-ink-muted">{dates}</span>}
                        {data.venue && <span className="text-meta text-ink-muted">{data.venue}</span>}
                        <ExhibitionStatus status={data.status} />
                    </div>
                </header>

                {text && <p className="max-w-prose font-editorial text-reading whitespace-pre-line">{text}</p>}
            </div>

            {artworks.length > 0 && (
                <section aria-labelledby="exhibition-works">
                    <h2 id="exhibition-works" className="mb-step-5 text-subheading">{t(locale, 'exhibitions.works')}</h2>
                    <HomeWall artworks={artworks} label={t(locale, 'exhibitions.wallLabel')} />
                </section>
            )}

            {artists.length > 0 && (
                <section aria-labelledby="exhibition-artists">
                    <h2 id="exhibition-artists" className="mb-step-4 text-subheading">{t(locale, 'exhibitions.participatingArtists')}</h2>
                    {/* The artists list's own card: one of the artist's works in this show, else the monogram. Under
                        the name, the artist's number of works in THIS show ("2 əsər"), counted from the works on the
                        page — not the direction. A slug can be null here (E10 is not filtered): then the card is
                        plain, not a link. */}
                    <ul className="grid grid-cols-2 gap-x-step-4 gap-y-step-7 md:grid-cols-4 md:gap-x-step-6">
                        {artists.map((artist) => (
                            <li key={artist.id}>
                                <ArtistCard
                                    artist={{ ...artist, direction: null, artworks_count: worksBy(artist, artworks).length }}
                                    artwork={artworkFor(artist, artworks)}
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {(photos.length > 0 || data.video) && (
                <section aria-labelledby="exhibition-media" className="flex flex-col gap-step-5">
                    <h2 id="exhibition-media" className="text-subheading">{t(locale, 'exhibitions.media')}</h2>
                    {photos.length > 0 && (
                        <ul className="grid grid-cols-1 gap-step-4 sm:grid-cols-2 lg:grid-cols-3">
                            {photos.map((photo, index) => (
                                <li key={photo.url} className="aspect-[4/3] overflow-hidden border border-line bg-surface-field">
                                    <img src={photo.url} alt={`${data.title} — ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                </li>
                            ))}
                        </ul>
                    )}
                    {data.video && <YoutubeEmbed video={data.video} title={data.title} />}
                </section>
            )}

            <div>
                <a href="/contact" className="inline-flex min-h-11 items-center text-ui text-ink">
                    <span className="link-line">{t(locale, 'exhibitions.enquire')}</span>
                </a>
            </div>
        </article>
    );
}
