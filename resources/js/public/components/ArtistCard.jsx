import ImageWithFallback from './ImageWithFallback.jsx';

export default function ArtistCard({ artist }) {
    return (
        <a href={`/artists/${artist.slug}`} className="block">
            <ImageWithFallback src={artist.portrait_url} alt={`${artist.first_name} ${artist.last_name}`} className="aspect-square w-full rounded-full object-cover" />
            <p className="mt-2 text-sm font-medium">{artist.first_name} {artist.last_name}</p>
            <p className="text-sm text-neutral-500">{artist.direction}</p>
        </a>
    );
}
