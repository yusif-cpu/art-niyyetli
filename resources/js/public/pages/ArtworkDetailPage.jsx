import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { seoMeta } from '../lib/seoMeta.js';
import { formatDimensions, formatPrice } from '../lib/format.js';
import { excerpt } from '../lib/text.js';
import { PRESETS } from '../lib/wall.js';
import { buttonClass } from '../lib/buttons.js';
import { useArtistHref } from '../layout/SiteDataContext.jsx';
import { getArtwork } from '../services/artworks.js';
import ArtworkViewer from '../components/ArtworkViewer.jsx';
import DetailWallView from '../components/DetailWallView.jsx';
import ScaledArtworkGrid from '../components/ScaledArtworkGrid.jsx';
import YoutubeEmbed from '../components/YoutubeEmbed.jsx';
import EnquiryForm from '../components/EnquiryForm.jsx';
import ErrorState from '../components/ErrorState.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import Monogram from '../components/Monogram.jsx';
import NotFoundState from '../components/NotFoundState.jsx';

const SECTION_PAD = 'py-[clamp(80px,9.72vw,140px)]';

function priceText(data, locale) {
    if (data.availability === 'sold') return { text: t(locale, 'artwork.sold'), muted: true };
    if (data.availability === 'reserved') return { text: t(locale, 'artwork.reserved'), muted: true };
    const price = formatPrice(data.price, data.currency);

    return price ? { text: price, muted: false } : { text: t(locale, 'artwork.priceOnRequest'), muted: false };
}

/** Label / value rows; a field without a value produces no row at all (no "no data" placeholders). */
function detailRows(data, locale) {
    return [
        ['dimensions', formatDimensions(data.width_cm, data.height_cm, locale)],
        ['medium', data.medium?.name],
        ['genre', data.genre?.name],
        ['year', data.year_created],
        ['code', data.inventory_code],
        ['provenance', data.provenance],
        ['frame', data.frame_condition],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');
}

/** The three small notes under the table: certificate (when there is one), delivery (when set), reply time. */
function notes(data, locale) {
    return [
        data.certificate && { key: 'certificate', title: t(locale, 'artwork.certificate'), text: t(locale, 'pages.artwork.certificateNote') },
        data.delivery_note && { key: 'delivery', title: t(locale, 'artwork.delivery'), text: data.delivery_note },
        { key: 'reply', title: t(locale, 'pages.artwork.reply'), text: t(locale, 'pages.artwork.replyNote') },
    ].filter(Boolean);
}

/** Text in paragraphs: blank lines (or single line breaks) split it. */
function paragraphs(text) {
    return String(text ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

function Skeleton() {
    return (
        <div aria-busy="true" data-testid="artwork-skeleton">
            <div className="lg:grid lg:min-h-[860px] lg:grid-cols-[1.35fr_1fr]" aria-hidden="true">
                <div className="h-[60vh] bg-surface-sunk lg:h-auto" />
                <div className="flex flex-col gap-step-3 px-page py-step-8">
                    <div className="h-3 w-1/4 bg-surface-sunk" />
                    <div className="h-12 w-3/4 bg-surface-sunk" />
                    <div className="h-4 w-1/2 bg-surface-sunk" />
                </div>
            </div>
        </div>
    );
}

/**
 * The artist row under "Əsər haqqında": a 76px wine monogram, the name and "Rəssamın səhifəsi". The artwork answer
 * carries only the artist's id, slug and name, and the page asks for nothing more (no birth year, place or direction
 * here: they are on the artist's page).
 */
function ArtistRow({ artist, href, locale }) {
    if (!artist?.name) return null;

    return (
        <div className="mt-step-7 flex items-center gap-step-5 border-t border-line pt-step-6" data-testid="artwork-artist-row">
            <span className="flex h-[76px] w-[76px] shrink-0 items-center justify-center bg-wine">
                <Monogram name={artist.name} className="text-[30px] text-wine-accent" />
            </span>
            <p className="min-w-0 flex-1 text-[16px] leading-[1.3] font-semibold text-wine">{artist.name}</p>
            {href && (
                <a href={href} className="inline-flex min-h-11 shrink-0 items-center text-[13px] font-semibold text-wine max-md:text-[14px]">
                    <span className="link-line">{t(locale, 'pages.artwork.artistPage')}</span>
                </a>
            )}
        </div>
    );
}

/**
 * An artwork (krem-bordo): a breadcrumb line; the work on its surface-sunk stage beside the facts (1.35fr | 1fr, 860px
 * tall) — the artist, the title in Spectral italic 62px, "year · medium", the price or status, "Sorğu göndər" and
 * "Divarda gör", the table and three small notes; then "Divarda gör" on a wine band; "Əsər haqqında" with the artist
 * row; the video; the enquiry form; and the other works (the existing similar-works answer: same genre).
 */
export default function ArtworkDetailPage({ params }) {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getArtwork(locale, params.code), [locale, params.code, retryToken]);
    const artistHref = useArtistHref(data?.artist);

    // seoMeta (shared with the other detail pages) lets the admin's SEO override in data.seo win and adds the
    // "| ArtNiyyətli" suffix; the fallbacks are "title, artist" and a word-safe 155-character excerpt.
    const artistName = data?.artist?.name;
    const mainImage = data?.images?.find((image) => image.is_main)?.url ?? data?.images?.[0]?.url ?? data?.image_url;
    const meta = data
        ? seoMeta(data, { title: [data.title, artistName].filter(Boolean).join(', '), description: excerpt(data.short_description) || undefined })
        : null;
    usePageMeta(meta ? { ...meta, og: { title: meta.title, description: meta.description, image: data.seo?.image_url ?? mainImage } } : {});

    if (loading && !data) return <Skeleton />;
    if (error?.status === 404) {
        return (
            <NotFoundState
                title={t(locale, 'artwork.notFoundTitle')}
                body={t(locale, 'artwork.notFoundBody')}
                links={[{ href: '/artworks', label: t(locale, 'artwork.backToCatalogue') }]}
            />
        );
    }
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const price = priceText(data, locale);
    const similar = Array.isArray(data.similar) ? data.similar : [];
    // The similar works are the same genre's (the API's rule); the title says "the artist's other works" only when that
    // is what they all are.
    const sameArtist = similar.length > 0 && data.artist?.id != null && similar.every((work) => work.artist?.id === data.artist.id);
    const status = data.availability === 'sold' ? t(locale, 'artwork.sold') : data.availability === 'reserved' ? t(locale, 'artwork.reserved') : t(locale, 'pages.artwork.available');
    const byline = [data.year_created, data.medium?.name].filter(Boolean).join(' · ');
    const description = paragraphs(data.short_description);

    return (
        <article className="font-ui" key={data.inventory_code}>
            <nav aria-label="Breadcrumb" className="border-b border-line px-page py-step-4 text-[13px] text-ink-muted max-md:text-[14px]" data-testid="breadcrumb">
                <ol className="flex flex-wrap items-center gap-x-step-2">
                    <li><a href="/artworks" className="hover:text-wine">{t(locale, 'nav.artworks')}</a></li>
                    {artistName && (
                        <li className="flex items-center gap-x-step-2">
                            <span aria-hidden="true">/</span>
                            {artistHref ? <a href={artistHref} className="hover:text-wine">{artistName}</a> : <span>{artistName}</span>}
                        </li>
                    )}
                    <li className="flex items-center gap-x-step-2">
                        <span aria-hidden="true">/</span>
                        <span aria-current="page" className="font-semibold text-wine">{data.title}</span>
                    </li>
                </ol>
            </nav>

            <div className="lg:grid lg:min-h-[860px] lg:grid-cols-[1.35fr_1fr]">
                <ArtworkViewer artwork={data} />

                <div className="px-page py-step-8 lg:py-[96px] lg:pl-[64px]">
                    {artistName &&
                        (artistHref ? (
                            <a href={artistHref} className="inline-flex min-h-11 items-center text-[12px] font-semibold tracking-[0.08em] text-wine hover:underline max-md:text-[14px]">
                                {artistName.toLocaleUpperCase(locale === 'az' ? 'az' : 'en')}
                            </a>
                        ) : (
                            <p className="text-[12px] font-semibold tracking-[0.08em] text-wine max-md:text-[14px]">{artistName.toLocaleUpperCase(locale === 'az' ? 'az' : 'en')}</p>
                        ))}
                    <h1 className="mt-step-2 font-editorial text-[clamp(40px,4.3vw,62px)] leading-[1.08] font-normal text-wine italic">{data.title}</h1>
                    {byline && <p className="figures mt-step-3 text-[15px] text-ink-muted">{byline}</p>}

                    <p className={`figures mt-step-7 text-[34px] leading-[1.1] font-semibold tracking-[-0.02em] ${price.muted ? 'text-ink-muted' : 'text-wine'}`} data-testid="artwork-price">
                        {price.text}
                    </p>
                    {!price.muted && (
                        <p className="mt-step-2 flex items-center gap-step-2 text-meta text-ink" data-testid="artwork-status">
                            <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-ink" />
                            {status}
                        </p>
                    )}

                    <div className="mt-step-6 flex flex-wrap gap-step-3">
                        <a href="#enquiry" className={buttonClass('primary', 'cream')}>{t(locale, 'artwork.enquire')}</a>
                        <a href="#wall-view" className={buttonClass('secondary', 'cream')}>{t(locale, 'artwork.wallTitle')}</a>
                    </div>

                    <dl className="@container mt-step-7 border-t border-line">
                        {detailRows(data, locale).map(([key, value]) => (
                            // Term beside value while the table is at least 17rem wide; narrower (200% zoom on a phone,
                            // a ~188px viewport) the term sits above its value, so nothing is cut or broken mid-word.
                            <div key={key} className="grid grid-cols-1 gap-step-1 border-b border-line py-step-3 @[17rem]:grid-cols-[minmax(0,8rem)_minmax(0,1fr)] @[17rem]:gap-step-4" data-testid={`row-${key}`}>
                                <dt className="text-meta text-ink-muted">{t(locale, `artwork.${key}`)}</dt>
                                <dd className={`text-[14px] break-words text-ink ${key === 'code' || key === 'year' || key === 'dimensions' ? 'figures' : ''}`}>{value}</dd>
                            </div>
                        ))}
                    </dl>

                    <ul className="mt-step-6 grid grid-cols-1 gap-step-4 sm:grid-cols-3" data-testid="artwork-notes">
                        {notes(data, locale).map((note) => (
                            <li key={note.key} data-testid={`note-${note.key}`}>
                                <p className="text-[13px] font-semibold text-wine max-md:text-[14px]">{note.title}</p>
                                <p className="mt-step-1 text-[13px] leading-[1.45] text-ink-muted max-md:text-[14px]">{note.text}</p>
                            </li>
                        ))}
                    </ul>

                    {data.whatsapp_link && (
                        <a href={data.whatsapp_link} className="mt-step-5 inline-flex min-h-11 items-center text-[14px] font-semibold text-wine" target="_blank" rel="noopener noreferrer">
                            <span className="link-line">{t(locale, 'artwork.contactWhatsapp')}</span>
                        </a>
                    )}
                </div>
            </div>

            {/* The wall comes straight after the work: the reader checks the size against a person before reading on. */}
            <div id="wall-view" className="scroll-mt-20">
                <DetailWallView artwork={data} />
            </div>

            {(description.length > 0 || artistName) && (
                <section aria-labelledby="artwork-about" className={`px-page ${SECTION_PAD}`} data-testid="artwork-about">
                    <div className="grid grid-cols-1 gap-step-6 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-step-9">
                        <SectionHeading id="artwork-about">
                            {t(locale, 'pages.artwork.aboutTitle')}
                        </SectionHeading>
                        <div className="min-w-0">
                            {description.map((text, index) => (
                                <p key={index} className={index === 0 ? 'font-editorial text-[19px] leading-[1.6] text-ink md:text-[21px]' : 'mt-step-5 font-editorial text-[17px] leading-[1.7] text-ink-muted md:text-[19px]'}>
                                    {text}
                                </p>
                            ))}
                            <ArtistRow artist={data.artist} href={artistHref} locale={locale} />
                        </div>
                    </div>
                    {data.video && (
                        <div className="mt-step-8 max-w-3xl">
                            <YoutubeEmbed video={data.video} title={data.title} />
                        </div>
                    )}
                </section>
            )}

            <section id="enquiry" aria-labelledby="enquiry-title" className={`scroll-mt-20 border-t border-line px-page ${SECTION_PAD}`}>
                <div className="grid grid-cols-1 gap-step-6 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-step-9">
                    <SectionHeading id="enquiry-title">{t(locale, 'pages.artwork.enquireTitle')}</SectionHeading>
                    <div className="bg-surface-sunk p-step-6 md:p-[56px]">
                        <EnquiryForm subject="buy" artworkCode={data.inventory_code} />
                    </div>
                </div>
            </section>

            {similar.length > 0 && (
                <section aria-labelledby="similar-title" className={`border-t border-line px-page ${SECTION_PAD}`}>
                    <SectionHeading id="similar-title" divider link={{ href: '/artworks', label: t(locale, 'pages.artwork.allWorks') }}>
                        {t(locale, sameArtist ? 'pages.artwork.otherWorks' : 'pages.artwork.similarWorks')}
                    </SectionHeading>
                    <div className="mt-step-7">
                        <ScaledArtworkGrid artworks={similar} preset={PRESETS.similar} />
                    </div>
                </section>
            )}
        </article>
    );
}
