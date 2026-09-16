import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import Button from '../components/Button.jsx';
import PageEditorScreen from './PageEditorScreen.jsx';

export default function PagesScreen() {
    const [pages, setPages] = useState(null);
    const [openPageId, setOpenPageId] = useState(null);

    function load() {
        apiFetch('/pages').then((res) => setPages(res.data));
    }

    useEffect(load, []);

    if (openPageId) {
        return (
            <PageEditorScreen
                pageId={openPageId}
                onBack={() => {
                    setOpenPageId(null);
                    load();
                }}
            />
        );
    }

    return (
        <div>
            <h1 className="mb-4 text-lg font-semibold text-neutral-900">Səhifələr</h1>
            {!pages && <p className="text-sm text-neutral-500">Yüklənir...</p>}
            <ul className="space-y-2">
                {pages?.map((page) => (
                    <li key={page.id} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3">
                        <div>
                            <p className="text-sm font-medium text-neutral-900">{page.translation?.title}</p>
                            <p className="text-xs text-neutral-500">{page.is_active ? 'Aktiv' : 'Deaktiv'}</p>
                        </div>
                        <Button variant="secondary" onClick={() => setOpenPageId(page.id)}>
                            Redaktə et
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
