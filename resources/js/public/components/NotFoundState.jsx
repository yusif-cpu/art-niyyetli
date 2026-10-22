import { usePageMeta } from '../lib/usePageMeta.js';
import { buttonClass } from '../lib/buttons.js';
import PageHeader from './PageHeader.jsx';
import { plainText } from './Emphasis.jsx';

/**
 * A "not found" screen for a missing page or record (krem-bordo): the wine band with the title (`*word*` emphasis
 * allowed) and a short text, then the ways back as buttons (`links` = [{ href, label }], the first one primary). Sets
 * the title and `noindex`. No Signal: a missing page is not an error the visitor made.
 */
export default function NotFoundState({ title, body, links = [] }) {
    usePageMeta({ title: `${plainText(title)} | ArtNiyyətli`, noIndex: true });

    return (
        <div className="font-ui">
            <PageHeader title={title} description={body} />
            {links.length > 0 && (
                <ul className="flex flex-wrap gap-step-3 px-page py-[clamp(64px,7vw,100px)]">
                    {links.map((link, index) => (
                        <li key={link.href}>
                            <a href={link.href} className={buttonClass(index === 0 ? 'primary' : 'secondary', 'cream')}>{link.label}</a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
