import BrandMark from './BrandMark.jsx';

// The server only accepts http(s) addresses for social links, but this is the last step before an address becomes
// an href on the page, so anything else (javascript:, data:, vbscript:, a malformed value) is simply not rendered.
function isWebUrl(url) {
    try {
        const { protocol } = new URL(url);

        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
}

// `textOnly` ignores the admin's display mode and never loads a logo image (the header shows platform names only).
export default function SocialLinks({ links, className = '', imgClassName = 'h-5 w-5 object-contain', textClassName = 'capitalize underline', textOnly = false }) {
    const visibleLinks = Array.isArray(links) ? links.filter((link) => isWebUrl(link?.url)) : [];

    if (visibleLinks.length === 0) return null;

    return (
        <ul className={`flex flex-wrap items-center ${className}`}>
            {visibleLinks.map((link, index) => (
                <li key={`${index}-${link.url}`}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <BrandMark
                            logoUrl={textOnly ? null : link.logo_url}
                            displayMode={textOnly ? 'text_only' : link.display_mode || 'logo_text'}
                            brandText={link.platform}
                            imgClassName={imgClassName}
                            textClassName={textClassName}
                        />
                    </a>
                </li>
            ))}
        </ul>
    );
}
