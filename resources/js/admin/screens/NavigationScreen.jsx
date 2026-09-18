import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Toggle from '../components/Toggle.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const PLACEMENT_TITLES = { header: 'Başlıq (əsas naviqasiya)', footer: 'Footer' };

const ROUTE_LABELS = {
    artworks: 'Əsərlər',
    artists: 'Rəssamlar',
    exhibitions: 'Sərgilər',
    articles: 'Jurnal',
};

function itemLabel(item) {
    return item.nav_type === 'page' ? item.page?.title : ROUTE_LABELS[item.route_key] ?? item.route_key;
}

export default function NavigationScreen() {
    const { show } = useToast();
    const [data, setData] = useState(null);
    const [meta, setMeta] = useState(null);
    const [error, setError] = useState('');
    const [selections, setSelections] = useState({ header: '', footer: '' });
    const [pendingRemoval, setPendingRemoval] = useState(null);

    function load() {
        setError('');
        apiFetch('/navigation')
            .then((res) => {
                setData(res.data);
                setMeta(res.meta);
            })
            .catch(() => setError('Naviqasiyanı yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, []);

    function availableOptions(placement) {
        const usedPageIds = new Set(data[placement].filter((i) => i.nav_type === 'page').map((i) => i.page.id));
        const usedRoutes = new Set(data[placement].filter((i) => i.nav_type === 'route').map((i) => i.route_key));

        const pageOptions = meta.available_pages
            .filter((p) => !usedPageIds.has(p.id))
            .map((p) => ({ value: `page:${p.id}`, label: p.title }));

        const routeOptions = meta.available_routes
            .filter((r) => !usedRoutes.has(r))
            .map((r) => ({ value: `route:${r}`, label: ROUTE_LABELS[r] ?? r }));

        return [...pageOptions, ...routeOptions];
    }

    async function addItem(placement) {
        const selection = selections[placement];
        if (!selection) return;
        const [type, value] = selection.split(':');

        try {
            await apiFetch('/navigation', {
                method: 'POST',
                body:
                    type === 'page'
                        ? { placement, nav_type: 'page', page_id: Number(value) }
                        : { placement, nav_type: 'route', route_key: value },
            });
            setSelections((s) => ({ ...s, [placement]: '' }));
            load();
        } catch (err) {
            if (err instanceof ApiError) show(err.message, 'error');
        }
    }

    async function toggleVisibility(item) {
        try {
            await apiFetch(`/navigation/${item.id}`, { method: 'PUT', body: { is_visible: !item.is_visible } });
            load();
        } catch (err) {
            if (err instanceof ApiError) show(err.message, 'error');
        }
    }

    async function confirmRemoval() {
        const item = pendingRemoval;
        setPendingRemoval(null);

        try {
            await apiFetch(`/navigation/${item.id}`, { method: 'DELETE' });
            show('Naviqasiya elementi silindi', 'success');
            load();
        } catch (err) {
            if (err instanceof ApiError) show(err.message, 'error');
        }
    }

    async function moveItem(placement, item, direction) {
        const list = data[placement];
        const index = list.findIndex((i) => i.id === item.id);
        const swapWith = list[index + direction];
        if (!swapWith) return;

        try {
            await apiFetch('/navigation/reorder', {
                method: 'POST',
                body: {
                    items: [
                        { id: item.id, sort_order: swapWith.sort_order },
                        { id: swapWith.id, sort_order: item.sort_order },
                    ],
                },
            });
            load();
        } catch (err) {
            if (err instanceof ApiError) show(err.message, 'error');
        }
    }

    return (
        <div>
            <PageHeader title="Naviqasiya" />
            <Banner type="error">{error}</Banner>

            <ConfirmDialog
                open={Boolean(pendingRemoval)}
                title="Bu elementi naviqasiyadan silmək istədiyinizə əminsiniz?"
                body="Səhifənin özü silinmir, yalnız naviqasiyadan çıxarılır. İstənilən vaxt yenidən əlavə edə bilərsiniz."
                onConfirm={confirmRemoval}
                onCancel={() => setPendingRemoval(null)}
            />

            {!data && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}

            {data && meta && (
                <div className="space-y-6">
                    {['header', 'footer'].map((placement) => {
                        const list = data[placement];
                        const options = availableOptions(placement);

                        return (
                            <div key={placement}>
                                <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                    {PLACEMENT_TITLES[placement]}
                                </h2>
                                <Card>
                                    {list.length === 0 && (
                                        <p className="px-1 py-2 text-sm text-neutral-500 dark:text-neutral-400">Element yoxdur.</p>
                                    )}
                                    {list.length > 0 && (
                                        <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                                            {list.map((item, index) => (
                                                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                                            {itemLabel(item)}
                                                        </p>
                                                        {item.nav_type === 'page' && !item.page.is_active && (
                                                            <StatusBadge active={false} inactiveLabel="Səhifə deaktivdir" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <button
                                                            type="button"
                                                            aria-label="Yuxarı"
                                                            disabled={index === 0}
                                                            onClick={() => moveItem(placement, item, -1)}
                                                            className="text-sm disabled:opacity-30"
                                                        >
                                                            ↑
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label="Aşağı"
                                                            disabled={index === list.length - 1}
                                                            onClick={() => moveItem(placement, item, 1)}
                                                            className="text-sm disabled:opacity-30"
                                                        >
                                                            ↓
                                                        </button>
                                                        <Toggle checked={item.is_visible} onChange={() => toggleVisibility(item)} label="Görünür" />
                                                        <Button variant="danger" onClick={() => setPendingRemoval(item)}>
                                                            Sil
                                                        </Button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Card>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <select
                                        aria-label={`${PLACEMENT_TITLES[placement]} üçün element seç`}
                                        value={selections[placement]}
                                        onChange={(e) => setSelections((s) => ({ ...s, [placement]: e.target.value }))}
                                        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                                    >
                                        <option value="">Element seçin...</option>
                                        {options.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <Button variant="secondary" onClick={() => addItem(placement)} disabled={!selections[placement]}>
                                        Əlavə et
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
