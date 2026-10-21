import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';

export default function ErrorState({ error, onRetry }) {
    const { locale } = useLocale();
    const message = error?.isRateLimited ? t(locale, 'enquiryForm.rateLimited') : t(locale, 'common.error');

    return (
        <div className="py-step-6 text-center font-ui" role="alert">
            {/* Errors use signal-ink (small red text) and count toward the screen's Signal budget. */}
            <p className="text-ui text-signal-ink">{message}</p>
            {onRetry && (
                <button type="button" onClick={onRetry} className="mt-step-2 inline-flex min-h-11 cursor-pointer items-center text-meta text-ink">
                    <span className="link-line">{t(locale, 'common.retry')}</span>
                </button>
            )}
        </div>
    );
}
