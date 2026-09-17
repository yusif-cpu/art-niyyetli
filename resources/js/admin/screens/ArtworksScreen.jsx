import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Banner from '../components/Banner.jsx';
import Pagination from '../components/Pagination.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ArtworkEditorScreen from './ArtworkEditorScreen.jsx';

const AVAILABILITY_LABELS = { available: 'Satışda', reserved: 'Rezerv edilib', sold: 'Satılıb' };

export default function ArtworksScreen() {
    const [artworks, setArtworks] = useState(null);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [availability, setAvailability] = useState('');
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);

    function load() {
        setError('');
        const params = new URLSearchParams({ page });
        if (search) params.set('search', search);
        if (availability) params.set('availability', availability);

        apiFetch('/artworks?' + params.toString())
            .then((res) => {
                setArtworks(res.data);
                setMeta(res.meta);
            })
            .catch(() => setError('Əsərləri yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, [page, search, availability]);

    async function moveArtwork(artwork, direction) {
        const index = artworks.findIndex((a) => a.id === artwork.id);
        const swapWith = artworks[index + direction];
        if (!swapWith) return;

        await apiFetch('/artworks/reorder', {
            method: 'POST',
            body: {
                items: [
                    { id: artwork.id, sort_order: swapWith.sort_order },
                    { id: swapWith.id, sort_order: artwork.sort_order },
                ],
            },
        });
        load();
    }

    if (openId) {
        return (
            <ArtworkEditorScreen
                artworkId={openId === 'new' ? null : openId}
                onBack={() => {
                    setOpenId(null);
                    load();
                }}
            />
        );
    }

    return (
        <div>
            <PageHeader title="Əsərlər" actions={<Button onClick={() => setOpenId('new')}>Yeni əsər</Button>} />

            <div className="mb-4 flex flex-wrap gap-2">
                <input
                    type="text"
                    placeholder="Başlıq və ya inventar kodu"
                    value={search}
                    onChange={(e) => {
                        setPage(1);
                        setSearch(e.target.value);
                    }}
                    className="min-w-[220px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
                />
                <select
                    value={availability}
                    onChange={(e) => {
                        setPage(1);
                        setAvailability(e.target.value);
                    }}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                >
                    <option value="">Bütün vəziyyətlər</option>
                    {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <Banner type="error">{error}</Banner>

            {artworks === null && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {artworks && artworks.length === 0 && (
                <EmptyState title="Hələ heç bir əsər əlavə edilməyib" body="İlk əsəri əlavə etmək üçün yuxarıdakı düyməni istifadə edin." />
            )}

            {artworks && artworks.length > 0 && (
                <Card>
                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {artworks.map((artwork, index) => (
                            <li key={artwork.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div className="flex items-center gap-3">
                                    {artwork.main_image?.url ? (
                                        <img src={artwork.main_image.url} alt="" className="h-10 w-10 rounded object-cover" />
                                    ) : (
                                        <span className="flex h-10 w-10 items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400 dark:bg-neutral-800">Şəkil yoxdur</span>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{artwork.translation?.title || 'Adsız əsər'}</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {artwork.inventory_code} · {artwork.artist?.name} · {AVAILABILITY_LABELS[artwork.availability]}
                                            {!artwork.is_active && (
                                                <>
                                                    {' · '}
                                                    <span className="font-medium text-red-700 dark:text-red-400">Deaktiv</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" disabled={index === 0} onClick={() => moveArtwork(artwork, -1)} className="text-sm disabled:opacity-30">
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        disabled={index === artworks.length - 1}
                                        onClick={() => moveArtwork(artwork, 1)}
                                        className="text-sm disabled:opacity-30"
                                    >
                                        ↓
                                    </button>
                                    <Button variant="secondary" onClick={() => setOpenId(artwork.id)}>
                                        Redaktə et
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <Pagination meta={meta} onPageChange={setPage} />
        </div>
    );
}
