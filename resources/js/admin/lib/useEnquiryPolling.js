import { useEffect, useRef, useState } from 'react';
import { apiFetch } from './api.js';

const POLL_INTERVAL_MS = 3000;

export function useEnquiryPolling(initialNewCount, initialTotalCount) {
    const [newCount, setNewCount] = useState(initialNewCount ?? 0);
    const [totalCount, setTotalCount] = useState(initialTotalCount ?? 0);
    const [refreshSignal, setRefreshSignal] = useState(0);
    const latestIdRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        function poll() {
            if (document.hidden) return;

            apiFetch('/enquiries/status')
                .then((res) => {
                    if (cancelled) return;

                    const { latest_id, new_count, total_count } = res.data;
                    setNewCount(new_count);
                    setTotalCount(total_count);

                    if (latestIdRef.current !== null && latest_id !== latestIdRef.current) {
                        setRefreshSignal((n) => n + 1);
                    }
                    latestIdRef.current = latest_id;
                })
                .catch(() => {});
        }

        poll();
        const interval = setInterval(poll, POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    return { newCount, totalCount, refreshSignal };
}
