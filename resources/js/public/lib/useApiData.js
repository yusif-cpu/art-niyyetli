import { useEffect, useState } from 'react';
import { PublicApiError } from './api.js';

export function useApiData(fetcher, deps) {
    const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });

    useEffect(() => {
        let cancelled = false;
        setState((current) => ({ ...current, loading: true, error: null }));

        fetcher()
            .then((res) => {
                if (cancelled) return;
                setState({ data: res?.data ?? null, meta: res?.meta ?? null, loading: false, error: null });
            })
            .catch((err) => {
                if (cancelled) return;
                setState({
                    data: null,
                    meta: null,
                    loading: false,
                    error: err instanceof PublicApiError ? err : new PublicApiError(0, 'Request failed.'),
                });
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return state;
}
