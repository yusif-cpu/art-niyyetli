import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { seoMeta } from '../lib/seoMeta.js';
import { excerpt } from '../lib/text.js';
import { getPage } from '../services/pages.js';
import ErrorState from '../components/ErrorState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import NotFoundPage from './NotFoundPage.jsx';

function Skeleton() {
    return (
        <div aria-busy="true" data-testid="page-skeleton">
            <div aria-hidden="true" className="flex flex-col gap-step-3 bg-wine px-page py-[88px]">
                <div className="h-14 w-1/2 bg-wine-deep" />
            </div>
        </div>
    );
}

/**
 * A CMS page (E4), krem-bordo: the wine band with the title, then in a 760px column the page text, then the sections in `sort_order`, each a heading and a text (and its
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
        <article className="font-ui" key={data.slug}>
            <PageHeader title={data.title} />

            <div className="mx-auto flex max-w-[760px] flex-col gap-step-8 px-page py-[clamp(64px,7vw,100px)] md:px-0">
                {data.content?.trim() && <p className="font-editorial text-[17px] leading-[1.75] whitespace-pre-line text-ink md:text-[19px]">{data.content}</p>}

                {sections.map((section) => (
                    <section key={section.key} aria-label={section.heading || undefined}>
                        {section.image_url && (
                            <div className="mb-step-5 aspect-[3/2] w-full overflow-hidden bg-surface-sunk">
                                <img src={section.image_url} alt={section.heading || ''} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                            </div>
                        )}
                        {section.heading && <h2 className="mb-step-4 text-[clamp(26px,2.4vw,34px)] leading-[1.15] font-bold tracking-[-0.025em] text-wine">{section.heading}</h2>}
                        <p className="font-editorial text-[17px] leading-[1.75] whitespace-pre-line text-ink md:text-[19px]">{section.body}</p>
                    </section>
                ))}
            </div>
        </article>
    );
}
