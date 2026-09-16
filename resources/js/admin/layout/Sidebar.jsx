const NAV_ITEMS = [
    { key: 'dashboard', label: 'Nəzarət paneli' },
    { key: 'artworks', label: 'Əsərlər' },
    { key: 'exhibitions', label: 'Sərgilər' },
    { key: 'articles', label: 'Məqalələr' },
    { key: 'enquiries', label: 'Sorğular' },
    { key: 'pages', label: 'Səhifələr' },
    { key: 'faqs', label: 'Tez-tez verilən suallar' },
    { key: 'settings', label: 'Sayt ayarları' },
    { key: 'social-links', label: 'Sosial media' },
    { key: 'media', label: 'Media' },
];

export default function Sidebar({ current, onNavigate, isAdministrator, open, onClose, badges = {} }) {
    const items = isAdministrator ? [...NAV_ITEMS, { key: 'users', label: 'İstifadəçilər' }] : NAV_ITEMS;

    return (
        <>
            {open && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={onClose} />}
            <nav
                className={`fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto border-r border-neutral-200 bg-white p-4 transition-transform md:static md:translate-x-0 ${
                    open ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <p className="mb-4 px-2 text-sm font-semibold text-neutral-900">ArtNiyyətli</p>
                <ul className="space-y-1">
                    {items.map((item) => (
                        <li key={item.key}>
                            <button
                                type="button"
                                onClick={() => {
                                    onNavigate(item.key);
                                    onClose?.();
                                }}
                                className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                                    current === item.key ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
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
            </nav>
        </>
    );
}
