import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { listArtists } from '../services/artists.js';
import ArtistCard from '../components/ArtistCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function ArtistsPage() {
    const { locale } = useLocale();
    const { data, loading, error } = useApiData(() => listArtists(locale), [locale]);

    usePageMeta({ title: `${t(locale, 'nav.artists')} — ArtNiyyətli` });

    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;
    if (data.length === 0) return <EmptyState />;

    return (
        <div className="px-6 py-8">
            <h1 className="mb-6 text-2xl font-semibold">{t(locale, 'nav.artists')}</h1>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {data.map((artist) => <ArtistCard key={artist.slug} artist={artist} />)}
            </div>
        </div>
    );
}
