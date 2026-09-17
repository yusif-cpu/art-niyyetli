import ImageWithFallback from './ImageWithFallback.jsx';

export default function ExhibitionCard({ exhibition }) {
    const mediaUrl = exhibition.media?.[0]?.url ?? null;

    return (
        <a href={`/exhibitions/${exhibition.slug}`} className="block">
            <ImageWithFallback src={mediaUrl} alt={exhibition.title} className="aspect-video w-full object-cover" />
            <p className="mt-2 text-sm font-medium">{exhibition.title}</p>
            <p className="text-sm text-neutral-500">{exhibition.start_date} – {exhibition.end_date}</p>
            <p className="text-sm text-neutral-500">{exhibition.venue}</p>
        </a>
    );
}
