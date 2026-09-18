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

export function usePageMeta({ title, description, noIndex = false } = {}) {
    useEffect(() => {
        if (title) {
            document.title = title;
        }

        upsertMetaByName('description', description || null);
        upsertMetaByName('robots', noIndex ? 'noindex, follow' : null);
        upsertCanonical();
    }, [title, description, noIndex]);
}
