import ImageWithFallback from './ImageWithFallback.jsx';

export default function ExhibitionCard({ exhibition }) {
    const mediaUrl = exhibition.media?.[0]?.url ?? null;

    return (
        <a href={`/exhibitions/${exhibition.slug}`} className="block">
            <ImageWithFallback src={mediaUrl} alt={exhibition.title} className="aspect-video w-full object-cover" />
            <p className="mt-step-2 text-byline-lg">{exhibition.title}</p>
            <p className="figures text-meta text-ink-muted">{exhibition.start_date} – {exhibition.end_date}</p>
            <p className="text-meta text-ink-muted">{exhibition.venue}</p>
        </a>
    );
}
