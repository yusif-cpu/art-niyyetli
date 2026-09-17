import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';

export default function EmptyState({ message }) {
    const { locale } = useLocale();
    return <p className="py-8 text-center text-sm text-neutral-500">{message || t(locale, 'common.empty')}</p>;
}
