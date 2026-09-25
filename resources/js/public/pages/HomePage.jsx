import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { getHomepage } from '../services/homepage.js';
import ArtworkCard from '../components/ArtworkCard.jsx';
import ArtistCard from '../components/ArtistCard.jsx';
import ExhibitionCard from '../components/ExhibitionCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

// Section keys are free-form admin data, not a fixed backend enum: look known sections up by key (never by
// position — the hero can be deactivated, renamed or reordered) and ignore every other key.
function findSection(page, key) {
    return page?.sections?.find((section) => section.key === key);
}

function SectionCopy({ section, headingClassName, as: Heading }) {
    return (
        <div className="mb-8">
            {section.heading && <Heading className={headingClassName}>{section.heading}</Heading>}
            {section.body && <p className="mt-2 text-neutral-600">{section.body}</p>}
        </div>
    );
}

export default function HomePage() {
    const { locale } = useLocale();
    const { data, loading, error } = useApiData(() => getHomepage(locale), [locale]);

    const hero = findSection(data?.page, 'hero');
    const steps = findSection(data?.page, 'steps');
    const cta = findSection(data?.page, 'cta');
    usePageMeta({
        title: data ? (hero ? `${hero.heading} — ArtNiyyətli` : 'ArtNiyyətli') : undefined,
        description: data ? hero?.body : undefined,
    });

    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;

    return (
        <div className="space-y-12 px-6 py-8">
            {(hero || steps) && (
                <section>
                    {hero && <SectionCopy section={hero} as="h1" headingClassName="text-2xl font-semibold" />}
                    {steps && <SectionCopy section={steps} as="h2" headingClassName="text-lg font-semibold" />}
                </section>
            )}

            {data.exhibition && (
                <section>
                    <ExhibitionCard exhibition={data.exhibition} />
                </section>
            )}

            {data.wall.length > 0 && (
                <section>
                    <h2 className="mb-4 text-lg font-semibold">{t(locale, 'home.wall')}</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {data.wall.map((artwork) => <ArtworkCard key={artwork.inventory_code} artwork={artwork} />)}
                    </div>
                </section>
            )}

            {data.featured.length > 0 && (
                <section>
                    <h2 className="mb-4 text-lg font-semibold">{t(locale, 'home.featured')}</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {data.featured.map((artwork) => <ArtworkCard key={artwork.inventory_code} artwork={artwork} />)}
                    </div>
                </section>
            )}

            {data.artists.length > 0 && (
                <section>
                    <h2 className="mb-4 text-lg font-semibold">{t(locale, 'home.artists')}</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {data.artists.map((artist) => <ArtistCard key={artist.slug} artist={artist} />)}
                    </div>
                </section>
            )}

            {data.faqs.length > 0 && (
                <section>
                    <h2 className="mb-4 text-lg font-semibold">{t(locale, 'home.faqs')}</h2>
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

            {cta && (
                <section>
                    <SectionCopy section={cta} as="h2" headingClassName="text-lg font-semibold" />
                </section>
            )}
        </div>
    );
}
