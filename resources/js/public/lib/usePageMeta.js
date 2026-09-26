import { useEffect } from 'react';

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

function upsertCanonical() {
    let tag = document.querySelector('link[rel="canonical"]');

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

/**
 * Head tags after the page has its data. `og` ({ title, description, image }) is optional: pages that pass it update
 * the Open Graph tags; pages that do not leave the server-rendered ones untouched.
 */
export function usePageMeta({ title, description, noIndex = false, og } = {}) {
    const ogTitle = og?.title;
    const ogDescription = og?.description;
    const ogImage = og?.image;

    useEffect(() => {
        if (title) {
            document.title = title;
        }

        upsertMetaByName('description', description || null);
        upsertMetaByName('robots', noIndex ? 'noindex, follow' : null);
        upsertCanonical();
        upsertMetaByProperty('og:title', ogTitle);
        upsertMetaByProperty('og:description', ogDescription);
        upsertMetaByProperty('og:image', ogImage);
    }, [title, description, noIndex, ogTitle, ogDescription, ogImage]);
}
