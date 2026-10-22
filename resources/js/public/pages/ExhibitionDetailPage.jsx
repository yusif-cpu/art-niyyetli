import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { seoMeta } from '../lib/seoMeta.js';
import { excerpt } from '../lib/text.js';
import { formatDateSpan } from '../lib/format.js';
import { artistName as nameOf } from '../lib/artists.js';
import { getExhibition, listExhibitions } from '../services/exhibitions.js';
import { listArtists } from '../services/artists.js';
import ScaledArtworkGrid from '../components/ScaledArtworkGrid.jsx';
import YoutubeEmbed from '../components/YoutubeEmbed.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundState from '../components/NotFoundState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Monogram from '../components/Monogram.jsx';
import ExhibitionCard, { exhibitionCover } from '../components/ExhibitionCard.jsx';
import { plainText } from '../components/Emphasis.jsx';
import { PRESETS } from '../lib/wall.js';

const SECTION_PAD = 'py-[clamp(80px,9.72vw,140px)]';
const GRID_PRESET = { ...PRESETS.catalogue, share: 0.3 };
const PAST_SHOWN = 2;

function Skeleton() {
    return (
        <div aria-busy="true" data-testid="exhibition-skeleton">
            <div aria-hidden="true" className="flex flex-col gap-step-3 bg-wine px-page py-[88px]">
                <div className="h-3 w-1/6 bg-wine-deep" />
                <div className="h-14 w-1/2 bg-wine-deep" />
                <div className="h-4 w-1/3 bg-wine-deep" />
            </div>
        </div>
    );
}

function paragraphs(text) {
    return String(text ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

/** One participating artist on wine-deep: the portrait or a 64px monogram, the name, "direction · year, place". */
function ArtistTile({ artist }) {
    const name = nameOf(artist);
    const line = [artist.direction, [artist.birth_year, artist.birth_place].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
    const body = (
        <>
            {artist.portrait_url ? (
                <img src={artist.portrait_url} alt="" loading="lazy" decoding="async" className="h-16 w-16 object-cover" />
            ) : (
                <span className="flex h-16 w-16 items-center justify-center bg-wine">
                    <Monogram name={name} className="text-[24px] text-wine-accent" />
                </span>
            )}
            <span className="mt-step-6 block text-[21px] leading-[1.2] font-semibold text-surface decoration-1 underline-offset-4 group-hover:underline">{name}</span>
            {line && <span className="figures mt-step-2 block text-[13px] leading-[1.45] text-wine-muted max-md:text-[14px]">{line}</span>}
        </>
    );

    return artist.slug ? (
        <a href={`/artists/${encodeURIComponent(artist.slug)}`} className="group block h-full bg-wine-deep p-step-6">{body}</a>
    ) : (
        <div className="h-full bg-wine-deep p-step-6">{body}</div>
    );
}

/**
 * An exhibition (krem-bordo): the wine header band — "Cari sərgi" with the red dot (a past show: "Keçmiş sərgi", no
 * dot), the title, the short text and the figures (dates, venue, artists, works) — with the cover inside the band, 72px
 * from the edges, 640px tall, "Ekspozisiya görünüşü" under it; 01 the text; 02 the works at true size with the
 * ScaleRule; 03 the participating artists on a wine band (their direction and birth from the artists list, E5);
 * the other photos and the video; 04 two past exhibitions. No Signal on the page.
 */
export default function ExhibitionDetailPage({ params }) {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getExhibition(locale, params.slug), [locale, params.slug, retryToken]);
    // Both only decorate the page: a failed answer leaves the cards plainer or the section out, never an error.
    const roster = useApiData(() => listArtists(locale), [locale]);
    const past = useApiData(() => listExhibitions(locale, { filter: 'archive', per_page: PAST_SHOWN + 1 }), [locale]);

    const photos = Array.isArray(data?.media) ? data.media.filter((m) => m.type === 'photo' && m.url) : [];
    const meta = data ? seoMeta(data, { title: data.title, description: data.short_text || excerpt(data.full_text) || undefined }) : null;
    usePageMeta(meta ? { ...meta, og: { title: meta.title, description: meta.description, image: data.seo?.image_url ?? photos[0]?.url ?? undefined } } : {});

    if (loading && !data) return <Skeleton />;
    if (error?.status === 404) {
        return <NotFoundState title={t(locale, 'exhibitions.notFoundTitle')} body={t(locale, 'exhibitions.notFoundBody')} links={[{ href: '/exhibitions', label: t(locale, 'exhibitions.backToList') }]} />;
    }
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const cover = exhibitionCover(data);
    const morePhotos = photos.filter((photo) => photo.url !== cover);
    const artworks = Array.isArray(data.artworks) ? data.artworks : [];
    const listed = Array.isArray(roster.data) ? roster.data : [];
    const artists = (Array.isArray(data.artists) ? data.artists.filter((a) => a.name) : []).map((artist) => ({
        ...(listed.find((full) => (artist.id != null && full.id === artist.id) || (artist.slug && full.slug === artist.slug)) ?? {}),
        ...artist,
    }));
    const pastShows = (Array.isArray(past.data) ? past.data : []).filter((show) => show.slug !== data.slug).slice(0, PAST_SHOWN);
    const text = paragraphs(data.full_text);
    const status = data.status === 'current' ? 'current' : data.status === 'upcoming' ? 'upcoming' : 'past';
    const figures = [
        { label: t(locale, 'pages.exhibition.metaDates'), value: formatDateSpan(data.start_date, data.end_date, locale, { short: true }) },
        { label: t(locale, 'pages.exhibition.metaVenue'), value: data.venue },
        { label: t(locale, 'pages.exhibition.metaArtists'), value: artists.length > 0 ? String(artists.length) : null },
        { label: t(locale, 'pages.exhibition.metaWorks'), value: artworks.length > 0 ? String(artworks.length) : null },
    ];

    let counter = 0;
    const next = () => String(++counter).padStart(2, '0');

    return (
        <article className="font-ui" key={data.slug}>
            <PageHeader label={t(locale, `pages.exhibition.${status}`)} dot={status === 'current'} title={data.title} description={data.short_text} meta={figures}>
                {cover && (
                    <div className="px-page">
                        <img src={cover} alt={plainText(data.title)} loading="eager" fetchPriority="high" decoding="async" className="block h-[56vw] w-full object-cover md:h-[640px]" data-testid="exhibition-cover" />
                    </div>
                )}
            </PageHeader>
            {cover && <p className="px-page pt-step-3 text-[13px] text-ink-muted max-md:text-[14px]">{t(locale, 'pages.exhibition.coverCaption')}</p>}

            {text.length > 0 && (
                <section aria-labelledby="exhibition-about" className={`px-page ${SECTION_PAD}`} data-testid="exhibition-intro">
                    <div className="grid grid-cols-1 gap-step-6 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-step-9">
                        <SectionHeading id="exhibition-about" number={next()}>{t(locale, 'pages.exhibition.aboutTitle')}</SectionHeading>
                        <div className="min-w-0 max-w-prose">
                            {text.map((p, index) => (
                                <p key={index} className={index === 0 ? 'text-[18px] leading-[1.5] font-medium text-ink md:text-[19px]' : 'mt-step-5 font-editorial text-[17px] leading-[1.7] text-ink-muted md:text-[18px]'}>{p}</p>
                            ))}
                            <a href="/contact" className="mt-step-6 inline-flex min-h-11 items-center text-[14px] font-semibold text-wine">
                                <span className="link-line">{t(locale, 'exhibitions.enquire')}</span>
                            </a>
                        </div>
                    </div>
                </section>
            )}

            {artworks.length > 0 && (
                <section aria-labelledby="exhibition-works" className={`px-page ${SECTION_PAD} ${text.length > 0 ? 'pt-0' : ''}`}>
                    <SectionHeading id="exhibition-works" number={next()} divider link={{ href: '/artworks', label: t(locale, 'pages.exhibition.inCatalogue') }}>
                        {t(locale, 'pages.exhibition.worksTitle')}
                    </SectionHeading>
                    <div className="mt-step-7">
                        <ScaledArtworkGrid artworks={artworks} preset={GRID_PRESET} />
                    </div>
                </section>
            )}

            {artists.length > 0 && (
                <section aria-labelledby="exhibition-artists" data-surface="wine" className={`bg-wine px-page text-surface ${SECTION_PAD}`}>
                    <SectionHeading id="exhibition-artists" number={next()} tone="wine" divider>{t(locale, 'pages.exhibition.artistsTitle')}</SectionHeading>
                    <ul className="mt-step-7 grid grid-cols-1 gap-step-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="exhibition-artists">
                        {artists.map((artist) => (
                            <li key={artist.id ?? artist.slug ?? artist.name}>
                                <ArtistTile artist={artist} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {(morePhotos.length > 0 || data.video) && (
                <section aria-labelledby="exhibition-media" className={`flex flex-col gap-step-6 px-page ${SECTION_PAD}`}>
                    <SectionHeading id="exhibition-media" divider>{t(locale, 'exhibitions.media')}</SectionHeading>
                    {morePhotos.length > 0 && (
                        <ul className="grid grid-cols-1 gap-step-4 sm:grid-cols-2 lg:grid-cols-3">
                            {morePhotos.map((photo, index) => (
                                <li key={photo.url} className="aspect-[4/3] overflow-hidden bg-surface-sunk">
                                    <img src={photo.url} alt={`${plainText(data.title)} — ${index + 2}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                </li>
                            ))}
                        </ul>
                    )}
                    {data.video && <YoutubeEmbed video={data.video} title={plainText(data.title)} />}
                </section>
            )}

            {pastShows.length > 0 && (
                <section aria-labelledby="exhibition-past" className={`px-page ${SECTION_PAD}`}>
                    <SectionHeading id="exhibition-past" number={next()} divider link={{ href: '/exhibitions', label: t(locale, 'pages.exhibition.allExhibitions') }}>
                        {t(locale, 'pages.exhibition.pastTitle')}
                    </SectionHeading>
                    <ul className="mt-step-7 grid grid-cols-1 gap-step-8 md:grid-cols-2 md:gap-step-6" data-testid="exhibition-past">
                        {pastShows.map((show) => (
                            <li key={show.slug}>
                                <ExhibitionCard exhibition={show} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </article>
    );
}
