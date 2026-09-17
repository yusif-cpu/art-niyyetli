import { useLocale } from '../i18n/LocaleContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { getHomepage } from '../services/homepage.js';
import ArtworkCard from '../components/ArtworkCard.jsx';
import ArtistCard from '../components/ArtistCard.jsx';
import ExhibitionCard from '../components/ExhibitionCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function HomePage() {
    const { locale } = useLocale();
    const { data, loading, error } = useApiData(() => getHomepage(locale), [locale]);

    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;

    return (
        <div className="space-y-12 px-6 py-8">
            {data.page && (
                <section>
                    {data.page.sections.map((section) => (
                        <div key={section.key} className="mb-8">
                            <h1 className="text-2xl font-semibold">{section.heading}</h1>
                            <p className="mt-2 text-neutral-600">{section.body}</p>
                        </div>
                    ))}
                </section>
            )}

            {data.exhibition && (
                <section>
                    <ExhibitionCard exhibition={data.exhibition} />
                </section>
            )}

            {data.wall.length > 0 && (
                <section>
                    <h2 className="mb-4 text-lg font-semibold">Divar</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {data.wall.map((artwork) => <ArtworkCard key={artwork.inventory_code} artwork={artwork} />)}
                    </div>
                </section>
            )}

            {data.featured.length > 0 && (
                <section>
                    <h2 className="mb-4 text-lg font-semibold">Seçilmişlər</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {data.featured.map((artwork) => <ArtworkCard key={artwork.inventory_code} artwork={artwork} />)}
                    </div>
                </section>
            )}

            {data.artists.length > 0 && (
                <section>
                    <h2 className="mb-4 text-lg font-semibold">Rəssamlar</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {data.artists.map((artist) => <ArtistCard key={artist.slug} artist={artist} />)}
                    </div>
                </section>
            )}

            {data.faqs.length > 0 && (
                <section>
                    <h2 className="mb-4 text-lg font-semibold">Suallar</h2>
                    <dl className="space-y-4">
                        {data.faqs.map((faq) => (
                            <div key={faq.id}>
                                <dt className="font-medium">{faq.question}</dt>
                                <dd className="text-neutral-600">{faq.answer}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            )}
        </div>
    );
}
