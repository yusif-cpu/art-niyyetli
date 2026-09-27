import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import NotFoundState from '../components/NotFoundState.jsx';

/** An unknown address: a short text and the two ways on — the home page and the catalogue. `noindex`. */
export default function NotFoundPage() {
    const { locale } = useLocale();

    return (
        <NotFoundState
            title={t(locale, 'notFound.title')}
            body={t(locale, 'notFound.body')}
            links={[{ href: '/', label: t(locale, 'notFound.home') }, { href: '/artworks', label: t(locale, 'notFound.catalogue') }]}
        />
    );
}
