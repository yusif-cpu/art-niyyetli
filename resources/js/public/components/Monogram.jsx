import { initials } from '../lib/artists.js';

/**
 * An artist's initials in light Spectral, ink-muted, standing in for a missing work or portrait: type only, no box,
 * no fill. Decorative: the name is always written next to it.
 */
export default function Monogram({ name, className = '' }) {
    return (
        <span aria-hidden="true" data-testid="artist-monogram" className={`font-editorial leading-none font-light text-ink-muted ${className}`}>
            {initials(name)}
        </span>
    );
}
