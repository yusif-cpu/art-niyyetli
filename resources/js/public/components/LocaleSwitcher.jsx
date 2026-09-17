import { useLocale } from '../i18n/LocaleContext.jsx';

const LOCALES = [
    { value: 'az', label: 'AZ' },
    { value: 'en', label: 'EN' },
];

export default function LocaleSwitcher() {
    const { locale, setLocale } = useLocale();

    return (
        <div className="inline-flex rounded-md border border-neutral-300 p-0.5" role="group" aria-label="Language">
            {LOCALES.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-current={locale === option.value ? 'true' : undefined}
                    onClick={() => setLocale(option.value)}
                    className={`rounded px-2 py-1 text-sm font-medium ${locale === option.value ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
