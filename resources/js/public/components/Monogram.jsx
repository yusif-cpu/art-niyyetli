import { initials } from '../lib/artists.js';

/**
 * An artist's initials in Spectral italic, standing in for a missing work or portrait. `className` sets the size and
 * the colour (wine by default; #F0D9CF on the wine-deep boxes). Decorative: the name is always written next to it.
 */
export default function Monogram({ name, className = 'text-wine' }) {
    return (
        <span aria-hidden="true" data-testid="artist-monogram" className={`font-editorial leading-none font-normal italic ${className}`}>
            {initials(name)}
        </span>
    );
}
