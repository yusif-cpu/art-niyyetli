import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';

export default function NotFoundPage() {
    const { locale } = useLocale();

    return (
        <div className="p-8 text-center">
            <h1 className="text-xl font-semibold">{t(locale, 'notFound.title')}</h1>
            <p className="mt-2 text-sm text-neutral-500">{t(locale, 'notFound.body')}</p>
        </div>
    );
}
