export default function BrandMark({ logoUrl, displayMode, brandText, className = '', imgClassName = 'h-8 w-auto', textClassName = 'text-subheading font-bold' }) {
    const showLogo = Boolean(logoUrl) && displayMode !== 'text_only';
    const showText = displayMode !== 'logo_only' || !logoUrl;
    const imgAlt = showText ? '' : brandText;

    return (
        <span className={`inline-flex items-center gap-step-3 ${className}`}>
            {showLogo && <img src={logoUrl} alt={imgAlt} className={imgClassName} loading="eager" decoding="async" />}
            {showText && <span className={textClassName}>{brandText}</span>}
        </span>
    );
}
