import { useCallback, useEffect, useState } from 'react';

function currentHash() {
    return window.location.hash.slice(1) || 'dashboard';
}

export function useHashRoute() {
    const [route, setRoute] = useState(currentHash);

    useEffect(() => {
        const onHashChange = () => setRoute(currentHash());
        window.addEventListener('hashchange', onHashChange);

        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const navigate = useCallback((to) => {
        window.location.hash = to;
    }, []);

    return [route, navigate];
}
