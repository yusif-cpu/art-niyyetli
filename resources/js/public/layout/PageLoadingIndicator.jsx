import { useSyncExternalStore } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { requestsInFlight, subscribeRequests } from '../lib/api.js';
import MascotSnake from '../components/MascotSnake.jsx';

/**
 * While any API request is in flight: the mascot in "travel" mode at the top edge of the screen, centred, over the
 * header's top padding (it takes no room and catches no click). Out of the DOM as soon as the requests end. The page
 * skeletons stay as they are: they hold the layout, this says that something is on its way.
 * The snake is hidden from screen readers; a status region says "Yüklənir…" instead. The region itself stays mounted
 * (only its text comes and goes), since a live region added together with its text is often not announced.
 */
export default function PageLoadingIndicator() {
    const { locale } = useLocale();
    const loading = useSyncExternalStore(subscribeRequests, requestsInFlight, () => 0) > 0;

    return (
        <>
            {loading && (
                <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center text-brand" data-testid="page-loading">
                    <MascotSnake mode="travel" width={240} />
                </div>
            )}
            <p role="status" className="sr-only">{loading ? t(locale, 'common.loading') : ''}</p>
        </>
    );
}
