import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { getArtwork } from '../services/artworks.js';
import ImageWithFallback from '../components/ImageWithFallback.jsx';
import ArtworkCard from '../components/ArtworkCard.jsx';
import EnquiryForm from '../components/EnquiryForm.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundPage from './NotFoundPage.jsx';

export default function ArtworkDetailPage({ params }) {
    const { locale } = useLocale();
    const { data, loading, error } = useApiData(() => getArtwork(locale, params.code), [locale, params.code]);

    usePageMeta(data ? { title: `${data.title} — ArtNiyyətli`, description: data.short_description } : {});

    if (loading) return <LoadingState />;
    if (error?.status === 404) return <NotFoundPage />;
    if (error) return <ErrorState error={error} />;

    return (
        <div className="grid grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-2">
            <div className="space-y-2">
                {data.images.map((image) => (
                    <ImageWithFallback
                        key={image.url}
                        src={image.url}
                        alt={data.artist?.name ? `${data.title} by ${data.artist.name}` : data.title}
                        className="w-full object-cover"
                    />
                ))}
            </div>

            <div>
                <h1 className="text-2xl font-semibold">{data.title}</h1>
                <p className="text-neutral-600">{data.artist.name}</p>
                <p className="mt-4">{data.short_description}</p>
                <p className="mt-2 text-sm text-neutral-500">{data.provenance}</p>
                <p className="mt-2 text-sm text-neutral-500">{data.width_cm} × {data.height_cm} cm, {data.year_created}</p>

                {data.whatsapp_link && (
                    <a href={data.whatsapp_link} className="mt-4 inline-block text-sm font-medium underline">
                        {t(locale, 'artwork.contactWhatsapp')}
                    </a>
                )}

                <div className="mt-6">
                    <EnquiryForm artworkCode={data.inventory_code} />
                </div>

                {data.similar.length > 0 && (
                    <div className="mt-8">
                        <h2 className="mb-3 text-lg font-semibold">{t(locale, 'artwork.similar')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {data.similar.map((artwork) => <ArtworkCard key={artwork.inventory_code} artwork={artwork} />)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
