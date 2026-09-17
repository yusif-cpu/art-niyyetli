import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Banner from '../components/Banner.jsx';
import Pagination from '../components/Pagination.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ArtistEditorScreen from './ArtistEditorScreen.jsx';

export default function ArtistsScreen() {
    const [artists, setArtists] = useState(null);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);

    function load() {
        setError('');
        const params = new URLSearchParams({ page });
        if (search) params.set('search', search);

        apiFetch('/artists?' + params.toString())
            .then((res) => {
                setArtists(res.data);
                setMeta(res.meta);
            })
            .catch(() => setError('Rəssamları yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, [page, search]);

    if (openId) {
        return (
            <ArtistEditorScreen
                artistId={openId === 'new' ? null : openId}
                onBack={() => {
                    setOpenId(null);
                    load();
                }}
            />
        );
    }

    return (
        <div>
            <PageHeader title="Rəssamlar" actions={<Button onClick={() => setOpenId('new')}>Yeni rəssam</Button>} />

            <input
                type="text"
                placeholder="Ad ilə axtar"
                value={search}
                onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                }}
                className="mb-4 w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
            />

            <Banner type="error">{error}</Banner>

            {artists === null && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {artists && artists.length === 0 && (
                <EmptyState title="Hələ heç bir rəssam əlavə edilməyib" body="İlk rəssamı əlavə etmək üçün yuxarıdakı düyməni istifadə edin." />
            )}

            {artists && artists.length > 0 && (
                <Card>
                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {artists.map((artist) => (
                            <li key={artist.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div className="flex items-center gap-3">
                                    {artist.portrait_url ? (
                                        <img src={artist.portrait_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                                    ) : (
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-xs text-neutral-400 dark:bg-neutral-800">Şəkil yoxdur</span>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                            {artist.translation?.first_name} {artist.translation?.last_name}
                                        </p>
                                        <StatusBadge active={artist.is_active} />
                                    </div>
                                </div>
                                <Button variant="secondary" onClick={() => setOpenId(artist.id)}>
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
