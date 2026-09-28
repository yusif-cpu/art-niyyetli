import { usePageMeta } from '../lib/usePageMeta.js';

/**
 * A "not found" screen for a missing page or record: the title, a short text and plain links back (`links` =
 * [{ href, label }]). Sets the title and `noindex`. No Signal: a missing page is not an error the visitor made.
 */
export default function NotFoundState({ title, body, links = [] }) {
    usePageMeta({ title: `${title} — ArtNiyyətli`, noIndex: true });

    return (
        <div className="px-page pt-step-8 pb-step-9 font-ui">
            <h1 className="text-display">{title}</h1>
            {body && <p className="mt-step-4 max-w-prose text-ui text-ink-muted">{body}</p>}
            {links.length > 0 && (
                <ul className="mt-step-4 flex flex-wrap gap-x-step-6">
                    {links.map((link) => (
                        <li key={link.href}>
                            <a href={link.href} className="inline-flex min-h-11 items-center text-ui text-ink underline decoration-1 underline-offset-2">{link.label}</a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
