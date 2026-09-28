import { Fragment } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';

const LOCALES = [
    { value: 'az', label: 'AZ' },
    { value: 'en', label: 'EN' },
];

// A text strip, "AZ / EN". The current language is told apart by ink and weight only — never by Signal.
export default function LocaleSwitcher({ className = '' }) {
    const { locale, setLocale } = useLocale();

    return (
        // Each language is a 44px touch target; the text stays small.
        <div className={`flex items-center text-label text-ink-muted ${className}`} role="group" aria-label="Language">
            {LOCALES.map((option, index) => {
                const current = locale === option.value;

                return (
                    <Fragment key={option.value}>
                        {index > 0 && <span aria-hidden="true">/</span>}
                        <button
                            type="button"
                            aria-current={current ? 'true' : undefined}
                            onClick={() => setLocale(option.value)}
                            className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center transition-colors duration-150 ease-standard ${current ? 'font-semibold text-ink' : 'text-ink-muted hover:text-ink'}`}
                        >
                            {option.label}
                        </button>
                    </Fragment>
                );
            })}
        </div>
    );
}
