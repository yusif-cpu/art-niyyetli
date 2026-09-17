export default function ImageWithFallback({ src, alt, className = '' }) {
    if (!src) {
        return <div className={`flex items-center justify-center bg-neutral-100 text-neutral-400 ${className}`} aria-hidden="true" />;
    }

    return <img src={src} alt={alt} className={className} />;
}
