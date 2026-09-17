import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Banner from '../components/Banner.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SocialLinkForm from './SocialLinkForm.jsx';

export default function SocialLinksScreen() {
    const { show } = useToast();
    const [links, setLinks] = useState(null);
    const [formOpen, setFormOpen] = useState(null); // null | 'new' | link
    const [formErrors, setFormErrors] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [error, setError] = useState('');

    function load() {
        setError('');
        apiFetch('/social-links')
            .then((res) => setLinks(res.data))
            .catch(() => setError('Sosial media əlaqələrini yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, []);

    async function saveLink(payload) {
        try {
            if (formOpen === 'new') {
                await apiFetch('/social-links', { method: 'POST', body: payload });
            } else {
                await apiFetch(`/social-links/${formOpen.id}`, { method: 'PUT', body: payload });
            }
            show('Əlaqə yadda saxlanıldı', 'success');
            setFormOpen(null);
            setFormErrors({});
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                setFormErrors(err.errors);
            }
        }
    }

    async function confirmDelete() {
        await apiFetch(`/social-links/${deleteTarget.id}`, { method: 'DELETE' });
        show('Əlaqə silindi', 'success');
        setDeleteTarget(null);
        load();
    }

    async function moveLink(link, direction) {
        const index = links.findIndex((l) => l.id === link.id);
        const swapWith = links[index + direction];
        if (!swapWith) return;

        await apiFetch('/social-links/reorder', {
            method: 'POST',
            body: {
                items: [
                    { id: link.id, sort_order: swapWith.sort_order },
                    { id: swapWith.id, sort_order: link.sort_order },
                ],
            },
        });
        load();
    }

    return (
        <div className="max-w-3xl">
            <PageHeader title="Sosial media" actions={<Button onClick={() => setFormOpen('new')}>Yeni əlaqə</Button>} />

            {formOpen && (
                <div className="mb-4">
                    <SocialLinkForm
                        link={formOpen === 'new' ? null : formOpen}
                        errors={formErrors}
                        onSave={saveLink}
                        onCancel={() => {
                            setFormOpen(null);
                            setFormErrors({});
                        }}
                    />
                </div>
            )}

            <Banner type="error">{error}</Banner>

            {links === null && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {links && links.length === 0 && <EmptyState title="Hələ heç bir əlaqə yoxdur" body="Yeni sosial media əlaqəsi əlavə edin." />}

            {links && links.length > 0 && (
                <Card>
                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {links.map((link, index) => (
                            <li key={link.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{link.platform}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{link.url}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" disabled={index === 0} onClick={() => moveLink(link, -1)} className="text-sm disabled:opacity-30">
                                        ↑
                                    </button>
                                    <button type="button" disabled={index === links.length - 1} onClick={() => moveLink(link, 1)} className="text-sm disabled:opacity-30">
                                        ↓
                                    </button>
                                    <Button variant="secondary" onClick={() => setFormOpen(link)}>
                                        Redaktə et
                                    </Button>
                                    <Button variant="danger" onClick={() => setDeleteTarget(link)}>
                                        Sil
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Əlaqəni silmək istədiyinizə əminsiniz?"
                body={deleteTarget?.platform}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
