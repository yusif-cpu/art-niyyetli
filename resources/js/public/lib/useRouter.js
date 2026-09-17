import { useCallback, useEffect, useState } from 'react';

const ROUTES = [
    { pattern: '/', page: 'home' },
    { pattern: '/artworks', page: 'catalogue' },
    { pattern: '/artworks/:code', page: 'artwork-detail' },
    { pattern: '/artists', page: 'artists' },
    { pattern: '/artists/:slug', page: 'artist-detail' },
    { pattern: '/exhibitions', page: 'exhibitions' },
    { pattern: '/exhibitions/:slug', page: 'exhibition-detail' },
    { pattern: '/articles', page: 'articles' },
    { pattern: '/articles/:slug', page: 'article-detail' },
    { pattern: '/:slug', page: 'static-page' },
];

function matchPath(pathname) {
    const pathParts = pathname.split('/').filter(Boolean);

    for (const route of ROUTES) {
        const patternParts = route.pattern.split('/').filter(Boolean);
        if (patternParts.length !== pathParts.length) continue;

        const params = {};
        let matched = true;
        for (let i = 0; i < patternParts.length; i++) {
            const part = patternParts[i];
            if (part.startsWith(':')) {
                params[part.slice(1)] = decodeURIComponent(pathParts[i]);
            } else if (part !== pathParts[i]) {
                matched = false;
                break;
            }
        }
        if (matched) return { page: route.page, params };
    }

    return { page: 'not-found', params: {} };
}

export function useRouter() {
    const [location, setLocation] = useState(() => matchPath(window.location.pathname));

    useEffect(() => {
        const onPopState = () => setLocation(matchPath(window.location.pathname));
        window.addEventListener('popstate', onPopState);

        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const navigate = useCallback((path) => {
        window.history.pushState(null, '', path);
        setLocation(matchPath(path));
    }, []);

    useEffect(() => {
        function onClick(event) {
            const anchor = event.target.closest('a');
            if (!anchor) return;

            const href = anchor.getAttribute('href');
            const isInternal = href && href.startsWith('/') && !href.startsWith('//');
            if (!isInternal || anchor.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            event.preventDefault();
            navigate(href);
        }

        document.addEventListener('click', onClick);

        return () => document.removeEventListener('click', onClick);
    }, [navigate]);

    return { page: location.page, params: location.params, navigate };
}
