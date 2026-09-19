import BrandMark from './BrandMark.jsx';

export default function SocialLinks({ links, className = '', imgClassName = 'h-5 w-5 object-contain', textClassName = 'capitalize underline' }) {
    if (!Array.isArray(links) || links.length === 0) return null;

    return (
        <ul className={`flex flex-wrap items-center ${className}`}>
            {links.map((link, index) => (
                <li key={`${index}-${link.url}`}>
                    <a href={link.url} target="_blank" rel="noreferrer">
                        <BrandMark
                            logoUrl={link.logo_url}
                            displayMode={link.display_mode || 'logo_text'}
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
