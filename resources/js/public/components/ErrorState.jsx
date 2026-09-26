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
                <button type="button" onClick={onRetry} className="mt-step-3 cursor-pointer border border-line-strong px-step-4 py-step-2 text-meta text-ink transition-colors duration-[120ms] ease-standard hover:border-ink">
                    {t(locale, 'common.retry')}
                </button>
            )}
        </div>
    );
}
