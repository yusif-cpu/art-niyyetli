import { useSyncExternalStore } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { requestsInFlight, subscribeRequests } from '../lib/api.js';

/**
 * Nothing visible: while a page loads, its own static skeleton holds the layout. While any API request is in flight a
 * status region says "Yüklənir…" for screen readers. The region itself stays mounted (only its text comes and goes),
 * since a live region added together with its text is often not announced.
 */
export default function PageLoadingIndicator() {
    const { locale } = useLocale();
    const loading = useSyncExternalStore(subscribeRequests, requestsInFlight, () => 0) > 0;

    return <p role="status" className="sr-only">{loading ? t(locale, 'common.loading') : ''}</p>;
}
