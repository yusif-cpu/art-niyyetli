import { Fragment } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';

const LOCALES = [
    { value: 'az', label: 'AZ' },
    { value: 'en', label: 'EN' },
];

// A text strip, "AZ / EN". The current language is told apart by ink and weight only — never by Signal. On the wine
// header (`tone="wine"`): surface for the current one, wine-muted for the other.
const TONES = {
    cream: { strip: 'text-ink-muted', current: 'font-semibold text-ink', other: 'text-ink-muted hover:text-ink' },
    wine: { strip: 'text-wine-muted', current: 'font-semibold text-surface', other: 'text-wine-muted hover:text-surface' },
};

export default function LocaleSwitcher({ className = '', tone = 'cream' }) {
    const colors = TONES[tone] ?? TONES.cream;
    const { locale, setLocale } = useLocale();

    return (
        // Each language is a 44px touch target; the text stays small.
        <div className={`flex items-center text-label ${colors.strip} ${className}`} role="group" aria-label="Language">
            {LOCALES.map((option, index) => {
                const current = locale === option.value;

                return (
                    <Fragment key={option.value}>
                        {index > 0 && <span aria-hidden="true">/</span>}
                        <button
                            type="button"
                            aria-current={current ? 'true' : undefined}
                            onClick={() => setLocale(option.value)}
                            className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center transition-colors duration-150 ease-standard ${current ? colors.current : colors.other}`}
                        >
                            {option.label}
                        </button>
                    </Fragment>
                );
            })}
        </div>
    );
}
