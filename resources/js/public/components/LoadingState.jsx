import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';

export default function LoadingState() {
    const { locale } = useLocale();
    return <p className="py-step-6 font-ui text-ui text-ink-muted">{t(locale, 'common.loading')}</p>;
}
