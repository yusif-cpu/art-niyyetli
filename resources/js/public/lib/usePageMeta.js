import { useEffect } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';

// The `og:locale` value per active locale (Open Graph's own locale tags, e.g. "az_AZ"/"en_US").
const OG_LOCALE = { az: 'az_AZ', en: 'en_US' };

function upsertMetaByName(name, content) {
    let tag = document.querySelector(`meta[name="${name}"]`);

    if (!content) {
        tag?.remove();

        return;
    }

    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
    }

    tag.setAttribute('content', content);
}

// A 404/invalid route must never canonicalize to itself (there is nothing valid at that URL to point crawlers at).
function upsertCanonical(enabled) {
    let tag = document.querySelector('link[rel="canonical"]');

    if (!enabled) {
        tag?.remove();

        return;
    }

    if (!tag) {
        tag = document.createElement('link');
        tag.setAttribute('rel', 'canonical');
        document.head.appendChild(tag);
    }

    tag.setAttribute('href', `${window.location.origin}${window.location.pathname}`);
}

function upsertMetaByProperty(property, content) {
    if (!content) return;
    let tag = document.querySelector(`meta[property="${property}"]`);

    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
    }

    tag.setAttribute('content', content);
}

// The routing has no distinct URL per locale (locale is a client-side, localStorage-backed choice, not a path), so
// the only honest hreflang is self-referencing: this one URL declares itself as both the az and en version.
function upsertAlternate(hreflang, href) {
    let tag = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);

    if (!href) {
        tag?.remove();

        return;
    }

    if (!tag) {
        tag = document.createElement('link');
        tag.setAttribute('rel', 'alternate');
        tag.setAttribute('hreflang', hreflang);
        document.head.appendChild(tag);
    }

    tag.setAttribute('href', href);
}

/**
 * Head tags after the page has its data. `og` ({ title, description, image }) is optional: a page that omits
 * `og.title`/`og.description` gets them mirrored from `title`/`description` (the common default, and what keeps
 * Open Graph tags from freezing at whatever locale the server happened to render first); passing them explicitly
 * (as the detail pages do, for a suffix-free/truncated variant) still wins. `og.image` has no such fallback.
 * The active locale (from `useLocale`, so every caller gets this for free) drives `html[lang]`, `og:locale` and a
 * self-referencing hreflang pair — suppressed, like the canonical link, when the page is `noIndex`.
 */
export function usePageMeta({ title, description, noIndex = false, og } = {}) {
    const { locale } = useLocale();
    const ogTitle = og?.title ?? title;
    const ogDescription = og?.description ?? description;
    const ogImage = og?.image;

    useEffect(() => {
        if (title) {
            document.title = title;
        }

        document.documentElement.lang = locale;

        upsertMetaByName('description', description || null);
        upsertMetaByName('robots', noIndex ? 'noindex, follow' : null);
        upsertCanonical(!noIndex);
        upsertMetaByProperty('og:title', ogTitle);
        upsertMetaByProperty('og:description', ogDescription);
        upsertMetaByProperty('og:image', ogImage);
        upsertMetaByProperty('og:locale', OG_LOCALE[locale]);

        const selfHref = noIndex ? null : `${window.location.origin}${window.location.pathname}`;
        upsertAlternate('az', selfHref);
        upsertAlternate('en', selfHref);
        upsertAlternate('x-default', selfHref);
    }, [title, description, noIndex, ogTitle, ogDescription, ogImage, locale]);
}
