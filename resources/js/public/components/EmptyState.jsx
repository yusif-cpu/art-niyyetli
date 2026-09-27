import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';

export default function EmptyState({ message }) {
    const { locale } = useLocale();
    return <p className="py-step-6 font-ui text-ui text-ink-muted">{message || t(locale, 'common.empty')}</p>;
}
