export default function BrandMark({ logoUrl, displayMode, brandText, className = '', imgClassName = 'h-8 w-auto', textClassName = 'text-lg font-semibold' }) {
    const showLogo = Boolean(logoUrl) && displayMode !== 'text_only';
    const showText = displayMode !== 'logo_only' || !logoUrl;
    const imgAlt = showText ? '' : brandText;

    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            {showLogo && <img src={logoUrl} alt={imgAlt} className={imgClassName} loading="eager" decoding="async" />}
            {showText && <span className={textClassName}>{brandText}</span>}
        </span>
    );
}
