import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import ArtistPortrait from './ArtistPortrait.jsx';

/**
 * One artist in a list: the round portrait (the client's exception to "no radius", for these cards only), then,
 * centred under it, the name, the direction and the number of works ("12 əsər", from `artworks_count`, S9: sent on
 * /artists and on /homepage artists). No count, or 0, shows nothing. The whole card is one link; hover darkens the
 * portrait's edge and underlines the name, nothing moves.
 */
export default function ArtistCard({ artist }) {
    const { locale } = useLocale();
    const name = [artist.first_name, artist.last_name].filter(Boolean).join(' ');
    const count = typeof artist.artworks_count === 'number' && artist.artworks_count > 0 ? artist.artworks_count : null;

    return (
        <a href={`/artists/${encodeURIComponent(artist.slug)}`} className="group block text-center font-ui text-ink">
            <ArtistPortrait artist={artist} shape="circle" hover />
            <p className="mt-step-3 text-byline-lg decoration-1 underline-offset-2 group-hover:underline">{name}</p>
            {artist.direction && <p className="mt-0.5 text-meta text-ink-muted">{artist.direction}</p>}
            {count && (
                <p className="figures mt-0.5 text-caption text-ink-muted" data-testid="artist-works-count">
                    {count} {t(locale, 'catalogue.count')}
                </p>
            )}
        </a>
    );
}
