const SITE_NAME = 'ArtNiyyətli';

/**
 * Title/description for usePageMeta on a detail page. An admin SEO override from the API (`data.seo`) wins over the
 * page's own fallback values; the title keeps the `— ArtNiyyətli` suffix, like App\Support\Seo\SeoText::pageTitle on
 * the server-rendered head this replaces after load.
 */
export function seoMeta(data, { title, description }) {
    const seo = data?.seo;

    return {
        title: `${seo?.title || title} — ${SITE_NAME}`,
        description: seo?.description || description,
    };
}
