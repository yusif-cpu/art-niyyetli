import Button from '../components/Button.jsx';

const LABELS = {
    artists: 'Rəssamlar',
    artworks: 'Əsərlər',
    exhibitions: 'Sərgilər',
    articles: 'Məqalələr',
    faqs: 'Suallar',
    enquiries: 'Sorğular',
};

const ENQUIRY_STATUS_LABELS = { new: 'Yeni', read: 'Oxunub', replied: 'Cavablandırılıb', closed: 'Bağlanıb' };

const QUICK_ACTIONS = [
    { label: 'Yeni əsər', hash: 'artworks' },
    { label: 'Yeni rəssam', hash: 'artists' },
    { label: 'Yeni sərgi', hash: 'exhibitions' },
    { label: 'Yeni məqalə', hash: 'articles' },
    { label: 'Yeni səhifə', hash: 'pages' },
];

function navigateTo(hash) {
    location.hash = hash;
}

function DashboardSection({ title, items, children }) {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
            <ul className="space-y-2">{children}</ul>
        </div>
    );
}

export default function DashboardScreen({ stats, recentEnquiries, upcomingExhibitions, recentArtworks }) {
    const newEnquiries = stats?.enquiries_new ?? 0;
    const isEmpty = Object.keys(LABELS).every((key) => (stats?.[key] ?? 0) === 0);

    return (
        <div>
            <h1 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Nəzarət paneli</h1>

            {isEmpty && (
                <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">Hələ heç bir məlumat yoxdur — məzmun əlavə etməyə başlayın.</p>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {Object.entries(LABELS).map(([key, label]) => (
                    <div
                        key={key}
                        className={`rounded-lg border bg-white p-4 dark:bg-neutral-900 ${
                            key === 'enquiries' && newEnquiries > 0
                                ? 'border-red-200 border-l-4 border-l-red-600 dark:border-red-900 dark:border-l-red-600'
                                : 'border-neutral-200 dark:border-neutral-800'
                        }`}
                    >
                        <p className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                            {label}
                            {key === 'enquiries' && newEnquiries > 0 && (
                                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white">
                                    {newEnquiries} yeni
                                </span>
                            )}
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{stats?.[key] ?? 0}</p>
                    </div>
                ))}
            </div>

            <h2 className="mb-2 mt-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Sürətli əməliyyatlar</h2>
            <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                    <Button key={action.hash} variant="secondary" onClick={() => navigateTo(action.hash)}>
                        {action.label}
                    </Button>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <DashboardSection title="Son müraciətlər" items={recentEnquiries}>
                    {recentEnquiries?.map((enquiry) => (
                        <li key={enquiry.id}>
                            <button
                                type="button"
                                onClick={() => navigateTo('enquiries')}
                                className="flex w-full items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                            >
                                <span>
                                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{enquiry.name}</span>
                                    {enquiry.inventory_code && <span className="text-neutral-500 dark:text-neutral-400"> · {enquiry.inventory_code}</span>}
                                </span>
                                <span className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                                    {ENQUIRY_STATUS_LABELS[enquiry.status] ?? enquiry.status}
                                    <span>{new Date(enquiry.created_at).toLocaleDateString('az')}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </DashboardSection>

                <DashboardSection title="Qarşıdan gələn sərgilər" items={upcomingExhibitions}>
                    {upcomingExhibitions?.map((exhibition) => (
                        <li key={exhibition.id}>
                            <button
                                type="button"
                                onClick={() => navigateTo('exhibitions')}
                                className="flex w-full items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                            >
                                <span className="font-medium text-neutral-900 dark:text-neutral-100">{exhibition.title}</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {exhibition.start_date} – {exhibition.end_date}
                                </span>
                            </button>
                        </li>
                    ))}
                </DashboardSection>

                <DashboardSection title="Son əlavə edilmiş əsərlər" items={recentArtworks}>
                    {recentArtworks?.map((artwork) => (
                        <li key={artwork.id}>
                            <button
                                type="button"
                                onClick={() => navigateTo('artworks')}
                                className="flex w-full items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                            >
                                <span className="font-medium text-neutral-900 dark:text-neutral-100">{artwork.title}</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{artwork.inventory_code}</span>
                            </button>
                        </li>
                    ))}
                </DashboardSection>
            </div>
        </div>
    );
}
