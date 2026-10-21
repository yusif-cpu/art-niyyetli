import { artistName } from '../lib/artists.js';
import Monogram from './Monogram.jsx';

/**
 * The artist's portrait on their own page: a 4:5 upright rectangle, cover-cropped, no frame, no shadow. Without a
 * portrait the rectangle holds the artist's monogram (bottom left) instead of an empty beige field. `className` sets
 * the width.
 */
export default function ArtistPortrait({ artist, className = 'w-full', priority = false }) {
    const name = artistName(artist);

    return (
        <div data-testid="artist-portrait" className={`aspect-[4/5] overflow-hidden ${artist.portrait_url ? 'bg-surface-field' : 'flex items-end'} ${className}`}>
            {artist.portrait_url ? (
                <img src={artist.portrait_url} alt={name} loading={priority ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
            ) : (
                <Monogram name={name} className="text-[64px]" />
            )}
        </div>
    );
}
