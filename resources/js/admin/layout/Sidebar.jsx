const NAV_SECTIONS = [
    {
        label: 'İdarəetmə',
        items: [
            { key: 'dashboard', label: 'Nəzarət paneli' },
            { key: 'enquiries', label: 'Sorğular' },
        ],
    },
    {
        label: 'Kontent',
        items: [
            { key: 'artists', label: 'Rəssamlar' },
            { key: 'artworks', label: 'Əsərlər' },
            { key: 'genres', label: 'Janrlar' },
            { key: 'mediums', label: 'Texnikalar' },
            { key: 'exhibitions', label: 'Sərgilər' },
            { key: 'articles', label: 'Məqalələr' },
            { key: 'pages', label: 'Səhifələr' },
            { key: 'navigation', label: 'Naviqasiya' },
            { key: 'faqs', label: 'Tez-tez verilən suallar' },
        ],
    },
    {
        label: 'Sayt',
        items: [
            { key: 'settings', label: 'Sayt ayarları' },
            { key: 'social-links', label: 'Sosial media' },
            { key: 'media', label: 'Media' },
        ],
    },
];

const SYSTEM_SECTION = {
    label: 'Sistem',
    items: [{ key: 'users', label: 'İstifadəçilər' }],
};

export default function Sidebar({ current, onNavigate, isAdministrator, open, onClose, badges = {} }) {
    const sections = isAdministrator ? [...NAV_SECTIONS, SYSTEM_SECTION] : NAV_SECTIONS;

    return (
        <>
            {open && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={onClose} />}
            <nav
                className={`fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto border-r border-neutral-200 bg-white p-4 transition-transform md:static md:translate-x-0 dark:border-neutral-800 dark:bg-neutral-900 ${
                    open ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <p className="mb-4 px-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">ArtNiyyətli</p>
                <div className="space-y-4">
                    {sections.map((section) => (
                        <div key={section.label}>
                            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">{section.label}</p>
                            <ul className="space-y-1">
                                {section.items.map((item) => (
                                    <li key={item.key}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onNavigate(item.key);
                                                onClose?.();
                                            }}
                                            className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                                                current === item.key
                                                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                                                    : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                                            }`}
                                        >
                                            {item.label}
                                            {badges[item.key] > 0 && (
                                                <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white">
                                                    {badges[item.key]}
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </nav>
        </>
    );
}
