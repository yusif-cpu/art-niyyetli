const LOCALES = [
    { value: 'az', label: 'AZ' },
    { value: 'en', label: 'EN' },
];

export default function LocaleTabs({ active, onChange }) {
    return (
        <div className="inline-flex rounded-md border border-neutral-300 p-0.5 dark:border-neutral-700" role="tablist">
            {LOCALES.map((locale) => (
                <button
                    key={locale.value}
                    type="button"
                    role="tab"
                    aria-selected={active === locale.value}
                    onClick={() => onChange(locale.value)}
                    className={`rounded px-3 py-1 text-sm font-medium ${
                        active === locale.value
                            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                            : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                    }`}
                >
                    {locale.label}
                </button>
            ))}
        </div>
    );
}
