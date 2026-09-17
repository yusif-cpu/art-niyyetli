import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Banner from '../components/Banner.jsx';
import Pagination from '../components/Pagination.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ExhibitionEditorScreen from './ExhibitionEditorScreen.jsx';

const STATUS_LABELS = { current: 'Cari', past: 'Keçmiş', upcoming: 'Gələcək' };
const TYPE_LABELS = { exhibition: 'Sərgi', news: 'Xəbər', announcement: 'Elan' };

export default function ExhibitionsScreen() {
    const [exhibitions, setExhibitions] = useState(null);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);

    function load() {
        setError('');
        const params = new URLSearchParams({ page });
        if (search) params.set('search', search);
        if (status) params.set('status', status);

        apiFetch('/exhibitions?' + params.toString())
            .then((res) => {
                setExhibitions(res.data);
                setMeta(res.meta);
            })
            .catch(() => setError('Sərgiləri yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, [page, search, status]);

    if (openId) {
        return (
            <ExhibitionEditorScreen
                exhibitionId={openId === 'new' ? null : openId}
                onBack={() => {
                    setOpenId(null);
                    load();
                }}
            />
        );
    }

    return (
        <div>
            <PageHeader title="Sərgilər" actions={<Button onClick={() => setOpenId('new')}>Yeni sərgi</Button>} />

            <div className="mb-4 flex flex-wrap gap-2">
                <input
                    type="text"
                    placeholder="Başlıq ilə axtar"
                    value={search}
                    onChange={(e) => {
                        setPage(1);
                        setSearch(e.target.value);
                    }}
                    className="min-w-[220px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
                />
                <select
                    value={status}
                    onChange={(e) => {
                        setPage(1);
                        setStatus(e.target.value);
                    }}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                >
                    <option value="">Bütün statuslar</option>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <Banner type="error">{error}</Banner>

            {exhibitions === null && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {exhibitions && exhibitions.length === 0 && (
                <EmptyState title="Hələ heç bir sərgi əlavə edilməyib" body="İlk sərgini əlavə etmək üçün yuxarıdakı düyməni istifadə edin." />
            )}

            {exhibitions && exhibitions.length > 0 && (
                <Card>
                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {exhibitions.map((exhibition) => (
                            <li key={exhibition.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{exhibition.translation?.title || 'Adsız sərgi'}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {TYPE_LABELS[exhibition.type]} · {STATUS_LABELS[exhibition.status]} · {exhibition.start_date} — {exhibition.end_date}
                                    </p>
                                </div>
                                <Button variant="secondary" onClick={() => setOpenId(exhibition.id)}>
                                    Redaktə et
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <Pagination meta={meta} onPageChange={setPage} />
        </div>
    );
}
