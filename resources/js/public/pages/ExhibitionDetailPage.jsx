import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { getExhibition } from '../services/exhibitions.js';
import ArtworkCard from '../components/ArtworkCard.jsx';
import ImageWithFallback from '../components/ImageWithFallback.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundPage from './NotFoundPage.jsx';

export default function ExhibitionDetailPage({ params }) {
    const { locale } = useLocale();
    const { data, loading, error } = useApiData(() => getExhibition(locale, params.slug), [locale, params.slug]);

    if (loading) return <LoadingState />;
    if (error?.status === 404) return <NotFoundPage />;
    if (error) return <ErrorState error={error} />;

    return (
        <div className="px-6 py-8">
            <h1 className="text-2xl font-semibold">{data.title}</h1>
            <p className="text-neutral-600">{data.start_date} – {data.end_date} · {data.venue}</p>
            <p className="mt-4">{data.full_text}</p>

            {data.media.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                    {data.media.map((item) => <ImageWithFallback key={item.url} src={item.url} alt={data.title} className="aspect-video w-full object-cover" />)}
                </div>
            )}

            {data.artists.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-lg font-semibold">{t(locale, 'exhibitions.participatingArtists')}</h2>
                    <ul className="mt-2 flex flex-wrap gap-3 text-sm">
                        {data.artists.map((artist) => (
                            <li key={artist.id}><a href={`/artists/${artist.slug}`} className="underline">{artist.name}</a></li>
                        ))}
                    </ul>
                </div>
            )}

            {data.artworks.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold">{t(locale, 'nav.artworks')}</h2>
                    <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {data.artworks.map((artwork) => <ArtworkCard key={artwork.inventory_code} artwork={artwork} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
