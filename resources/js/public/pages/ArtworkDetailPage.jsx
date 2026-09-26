import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { seoMeta } from '../lib/seoMeta.js';
import { formatDimensions, formatPrice } from '../lib/format.js';
import { excerpt } from '../lib/text.js';
import { PRESETS } from '../lib/wall.js';
import { useArtistHref } from '../layout/SiteDataContext.jsx';
import { getArtwork } from '../services/artworks.js';
import ArtworkViewer from '../components/ArtworkViewer.jsx';
import DetailWallView from '../components/DetailWallView.jsx';
import ScaledArtworkGrid from '../components/ScaledArtworkGrid.jsx';
import YoutubeEmbed from '../components/YoutubeEmbed.jsx';
import EnquiryForm from '../components/EnquiryForm.jsx';
import ErrorState from '../components/ErrorState.jsx';

const SITE = 'ArtNiyyətli';

function priceText(data, locale) {
    if (data.availability === 'sold') return { text: t(locale, 'artwork.sold'), muted: true };
    if (data.availability === 'reserved') return { text: t(locale, 'artwork.reserved'), muted: true };
    const price = formatPrice(data.price, data.currency);

    return price ? { text: price, muted: false } : { text: t(locale, 'artwork.priceOnRequest'), muted: true };
}

/** Label / value rows; a field without a value produces no row at all (no "no data" placeholders). */
function detailRows(data, locale) {
    return [
        ['year', data.year_created],
        ['dimensions', formatDimensions(data.width_cm, data.height_cm, locale)],
        ['medium', data.medium?.name],
        ['genre', data.genre?.name],
        ['code', data.inventory_code],
        ['provenance', data.provenance],
        ['certificate', data.certificate ? t(locale, 'artwork.certificateYes') : null],
        ['frame', data.frame_condition],
        ['delivery', data.delivery_note],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');
}

function Skeleton() {
    return (
        <div className="px-page pt-step-8 pb-step-9" aria-busy="true" data-testid="artwork-skeleton">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-step-8" aria-hidden="true">
                <div className="aspect-[4/3] w-full border border-line bg-surface-field" />
                <div className="mt-step-6 flex flex-col gap-step-3 lg:mt-0">
                    <div className="h-8 w-3/4 bg-surface-field" />
                    <div className="h-4 w-1/2 bg-surface-field" />
                    <div className="h-4 w-2/3 bg-surface-field" />
                </div>
            </div>
        </div>
    );
}

function NotFound({ locale }) {
    usePageMeta({ title: `${t(locale, 'artwork.notFoundTitle')} — ${SITE}`, noIndex: true });

    return (
        <div className="px-page pt-step-8 pb-step-9 font-ui">
            <h1 className="text-display">{t(locale, 'artwork.notFoundTitle')}</h1>
            <p className="mt-step-4 text-ui text-ink-muted">{t(locale, 'artwork.notFoundBody')}</p>
            <a href="/artworks" className="mt-step-5 inline-block text-ui text-ink underline decoration-1 underline-offset-2">
                {t(locale, 'artwork.backToCatalogue')}
            </a>
        </div>
    );
}

export default function ArtworkDetailPage({ params }) {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getArtwork(locale, params.code), [locale, params.code, retryToken]);
    const artistHref = useArtistHref(data?.artist);

    // seoMeta (shared with the other detail pages) lets the admin's SEO override in data.seo win and adds the
    // "— ArtNiyyətli" suffix; the fallbacks are "title, artist" and a word-safe 155-character excerpt.
    const artistName = data?.artist?.name;
    const mainImage = data?.images?.find((image) => image.is_main)?.url ?? data?.images?.[0]?.url ?? data?.image_url;
    const meta = data
        ? seoMeta(data, { title: [data.title, artistName].filter(Boolean).join(', '), description: excerpt(data.short_description) || undefined })
        : null;
    usePageMeta(meta ? { ...meta, og: { title: meta.title, description: meta.description, image: data.seo?.image_url ?? mainImage } } : {});

    if (loading && !data) return <Skeleton />;
    if (error?.status === 404) return <NotFound locale={locale} />;
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const price = priceText(data, locale);
    const similar = Array.isArray(data.similar) ? data.similar : [];

    return (
        <article className="px-page pt-step-8 pb-step-9 font-ui" key={data.inventory_code}>
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-step-8">
                <ArtworkViewer artwork={data} />

                <div className="mt-step-7 lg:mt-0">
                    <h1 className="font-editorial text-heading italic">{data.title}</h1>
                    {artistName &&
                        (artistHref ? (
                            <a href={artistHref} className="mt-step-2 inline-block text-byline-lg text-ink decoration-1 underline-offset-2 hover:underline">
                                {artistName}
                            </a>
                        ) : (
                            <p className="mt-step-2 text-byline-lg">{artistName}</p>
                        ))}

                    <p className={`mt-step-5 text-subheading ${price.muted ? 'text-ink-muted' : 'figures'}`} data-testid="artwork-price">
                        {price.text}
                    </p>

                    <dl className="mt-step-5 border-t border-line">
                        {detailRows(data, locale).map(([key, value]) => (
                            <div key={key} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-step-4 border-b border-line py-step-2" data-testid={`row-${key}`}>
                                <dt className="text-label text-ink-muted">{t(locale, `artwork.${key}`)}</dt>
                                <dd className={`text-ui ${key === 'code' || key === 'year' || key === 'dimensions' ? 'figures' : ''}`}>{value}</dd>
                            </div>
                        ))}
                    </dl>

                    {data.whatsapp_link && (
                        <a href={data.whatsapp_link} className="mt-step-5 inline-block text-ui text-ink underline decoration-1 underline-offset-2" target="_blank" rel="noopener noreferrer">
                            {t(locale, 'artwork.contactWhatsapp')}
                        </a>
                    )}
                </div>
            </div>

            {data.short_description && (
                <p className="mt-step-8 max-w-prose font-editorial text-reading whitespace-pre-line">{data.short_description}</p>
            )}

            {data.video && (
                <div className="mt-step-8 max-w-3xl">
                    <YoutubeEmbed video={data.video} title={data.title} />
                </div>
            )}

            <div className="mt-step-9">
                <DetailWallView artwork={data} />
            </div>

            <section aria-labelledby="enquiry-title" className="mt-step-9 max-w-xl">
                <h2 id="enquiry-title" className="text-subheading">{t(locale, 'artwork.enquireTitle')}</h2>
                <div className="mt-step-5">
                    <EnquiryForm subject="buy" artworkCode={data.inventory_code} />
                </div>
            </section>

            {similar.length > 0 && (
                <section aria-labelledby="similar-title" className="mt-step-9">
                    <h2 id="similar-title" className="mb-step-5 text-subheading">{t(locale, 'artwork.similar')}</h2>
                    <ScaledArtworkGrid artworks={similar} preset={PRESETS.similar} />
                </section>
            )}
        </article>
    );
}
