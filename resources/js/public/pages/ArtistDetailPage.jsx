import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { getArtist } from '../services/artists.js';
import ImageWithFallback from '../components/ImageWithFallback.jsx';
import ArtworkCard from '../components/ArtworkCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundPage from './NotFoundPage.jsx';

export default function ArtistDetailPage({ params }) {
    const { locale } = useLocale();
    const { data, loading, error } = useApiData(() => getArtist(locale, params.slug), [locale, params.slug]);

    if (loading) return <LoadingState />;
    if (error?.status === 404) return <NotFoundPage />;
    if (error) return <ErrorState error={error} />;

    return (
        <div className="px-6 py-8">
            <ImageWithFallback src={data.portrait_url} alt={`${data.first_name} ${data.last_name}`} className="h-48 w-48 rounded-full object-cover" />
            <h1 className="mt-4 text-2xl font-semibold">{data.first_name} {data.last_name}</h1>
            <p className="text-neutral-600">{data.direction}</p>
            <p className="mt-4">{data.biography}</p>
            <p className="mt-2 text-neutral-600">{data.artistic_approach}</p>

            {data.exhibitions.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-lg font-semibold">{t(locale, 'artist.exhibitionHistory')}</h2>
                    <ul className="mt-2 space-y-1 text-sm">
                        {data.exhibitions.map((ex, i) => <li key={i}>{ex.year} — <span>{ex.title}</span> ({ex.venue})</li>)}
                    </ul>
                </div>
            )}

            {data.awards.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-lg font-semibold">{t(locale, 'artist.awards')}</h2>
                    <ul className="mt-2 space-y-1 text-sm">
                        {data.awards.map((award, i) => <li key={i}>{award.year} — <span>{award.title}</span></li>)}
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
