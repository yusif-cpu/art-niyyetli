import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import ArtistPortrait from './ArtistPortrait.jsx';

/**
 * One artist in a list: the 4:5 portrait, the name, the direction and — once the API sends it (G-3) — the number of
 * works. The whole card is one link; hover darkens the portrait's edge and underlines the name, nothing moves.
 */
export default function ArtistCard({ artist }) {
    const { locale } = useLocale();
    const name = [artist.first_name, artist.last_name].filter(Boolean).join(' ');
    const count = artist.artworks_count;

    return (
        <a href={`/artists/${encodeURIComponent(artist.slug)}`} className="group block font-ui text-ink">
            <ArtistPortrait artist={artist} hover />
            <p className="mt-step-3 text-byline-lg decoration-1 underline-offset-2 group-hover:underline">{name}</p>
            {artist.direction && <p className="mt-0.5 text-meta text-ink-muted">{artist.direction}</p>}
            {typeof count === 'number' && (
                <p className="figures mt-0.5 text-caption text-ink-muted">
                    {count} {t(locale, 'catalogue.count')}
                </p>
            )}
        </a>
    );
}
