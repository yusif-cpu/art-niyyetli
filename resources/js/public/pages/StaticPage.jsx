import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { seoMeta } from '../lib/seoMeta.js';
import { excerpt } from '../lib/text.js';
import { getPage } from '../services/pages.js';
import ErrorState from '../components/ErrorState.jsx';
import NotFoundPage from './NotFoundPage.jsx';

function Skeleton() {
    return (
        <div className="px-page pt-step-8 pb-step-9" aria-busy="true" data-testid="page-skeleton">
            <div aria-hidden="true" className="flex max-w-prose flex-col gap-step-3">
                <div className="h-10 w-1/2 bg-surface-field" />
                <div className="mt-step-5 h-4 w-full bg-surface-field" />
                <div className="h-4 w-5/6 bg-surface-field" />
            </div>
        </div>
    );
}

/**
 * A CMS page (E4): the title, the page text, then the sections in `sort_order`, each a heading and a text (and its
 * image when there is one). All plain authored text, never HTML; line breaks kept. A section without text is left
 * out. Placeholder copy ("[PLACEHOLDER]" on the legal pages) is shown as it is, on purpose: hiding it would let a
 * missing text go unnoticed.
 */
export default function StaticPage({ params }) {
    const { locale } = useLocale();
    const [retryToken, setRetryToken] = useState(0);
    const { data, loading, error } = useApiData(() => getPage(locale, params.slug), [locale, params.slug, retryToken]);

    usePageMeta(data ? seoMeta(data, { title: data.title, description: excerpt(data.content) || undefined }) : {});

    if (loading && !data) return <Skeleton />;
    if (error?.status === 404) return <NotFoundPage />;
    if (error) return <ErrorState error={error} onRetry={() => setRetryToken((n) => n + 1)} />;

    const sections = (Array.isArray(data.sections) ? [...data.sections] : [])
        .filter((section) => section.body?.trim())
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return (
        <article className="px-page pt-step-8 pb-step-9 font-ui" key={data.slug}>
            <h1 className="border-b border-line pb-step-5 text-display">{data.title}</h1>

            <div className="mt-step-7 flex max-w-prose flex-col gap-step-7">
                {data.content?.trim() && <p className="font-editorial text-reading whitespace-pre-line">{data.content}</p>}

                {sections.map((section) => (
                    <section key={section.key} aria-label={section.heading || undefined}>
                        {section.image_url && (
                            <div className="mb-step-4 aspect-[3/2] w-full overflow-hidden border border-line bg-surface-field">
                                <img src={section.image_url} alt={section.heading || ''} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                            </div>
                        )}
                        {section.heading && <h2 className="mb-step-3 text-subheading">{section.heading}</h2>}
                        <p className="font-editorial text-reading whitespace-pre-line">{section.body}</p>
                    </section>
                ))}
            </div>
        </article>
    );
}
