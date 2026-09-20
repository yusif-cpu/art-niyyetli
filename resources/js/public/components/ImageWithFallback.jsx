/**
 * Images are lazy-loaded and decoded off the main thread by default, so a catalogue page does not fetch every
 * card image up front. Pass `priority` for an image that is clearly above the fold (e.g. the first image on
 * an artwork page): it loads eagerly and is fetched with high priority.
 */
export default function ImageWithFallback({ src, alt, className = '', priority = false }) {
    if (!src) {
        return <div className={`flex items-center justify-center bg-neutral-100 text-neutral-400 ${className}`} aria-hidden="true" />;
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
        />
    );
}
