const LABELS = {
    artists: 'Sənətkarlar',
    artworks: 'Əsərlər',
    exhibitions: 'Sərgilər',
    articles: 'Məqalələr',
    faqs: 'Suallar',
    enquiries: 'Sorğular',
};

export default function DashboardScreen({ stats }) {
    return (
        <div>
            <h1 className="mb-4 text-lg font-semibold text-neutral-900">Nəzarət paneli</h1>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {Object.entries(LABELS).map(([key, label]) => (
                    <div key={key} className="rounded-lg border border-neutral-200 bg-white p-4">
                        <p className="text-sm text-neutral-500">{label}</p>
                        <p className="mt-1 text-2xl font-semibold text-neutral-900">{stats?.[key] ?? 0}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
