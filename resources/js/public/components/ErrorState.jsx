import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';

export default function ErrorState({ error, onRetry }) {
    const { locale } = useLocale();
    const message = error?.isRateLimited ? t(locale, 'enquiryForm.rateLimited') : t(locale, 'common.error');

    return (
        <div className="py-8 text-center">
            <p className="text-sm text-red-700">{message}</p>
            {onRetry && (
                <button type="button" onClick={onRetry} className="mt-2 text-sm font-medium underline">
                    {t(locale, 'common.retry')}
                </button>
            )}
        </div>
    );
}
