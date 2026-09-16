import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FaqForm from './FaqForm.jsx';

export default function FaqScreen() {
    const { show } = useToast();
    const [faqs, setFaqs] = useState(null);
    const [pages, setPages] = useState([]);
    const [formOpen, setFormOpen] = useState(null); // null | 'new' | faq
    const [formErrors, setFormErrors] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);

    function load() {
        apiFetch('/faqs').then((res) => setFaqs(res.data));
        apiFetch('/pages').then((res) => setPages(res.data));
    }

    useEffect(load, []);

    async function saveFaq(payload) {
        try {
            if (formOpen === 'new') {
                await apiFetch('/faqs', { method: 'POST', body: payload });
            } else {
                await apiFetch(`/faqs/${formOpen.id}`, { method: 'PUT', body: payload });
            }
            show('Sual yadda saxlanıldı', 'success');
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
        await apiFetch(`/faqs/${deleteTarget.id}`, { method: 'DELETE' });
        show('Sual silindi', 'success');
        setDeleteTarget(null);
        load();
    }

    async function moveFaq(faq, direction) {
        const index = faqs.findIndex((f) => f.id === faq.id);
        const swapWith = faqs[index + direction];
        if (!swapWith) return;

        await apiFetch('/faqs/reorder', {
            method: 'POST',
            body: {
                items: [
                    { id: faq.id, sort_order: swapWith.sort_order },
                    { id: swapWith.id, sort_order: faq.sort_order },
                ],
            },
        });
        load();
    }

    return (
        <div className="max-w-3xl">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-lg font-semibold text-neutral-900">Tez-tez verilən suallar</h1>
                <Button onClick={() => setFormOpen('new')}>Yeni sual</Button>
            </div>

            {formOpen && (
                <div className="mb-4">
                    <FaqForm
                        faq={formOpen === 'new' ? null : formOpen}
                        pages={pages}
                        errors={formErrors}
                        onSave={saveFaq}
                        onCancel={() => {
                            setFormOpen(null);
                            setFormErrors({});
                        }}
                    />
                </div>
            )}

            {faqs && faqs.length === 0 && <EmptyState title="Hələ heç bir sual yoxdur" body="Yeni sual əlavə edin." />}

            <ul className="space-y-2">
                {faqs?.map((faq, index) => (
                    <li key={faq.id} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3">
                        <div>
                            <p className="text-sm font-medium text-neutral-900">{faq.translation?.question}</p>
                            <p className="text-xs text-neutral-500">{faq.is_active ? 'Aktiv' : 'Deaktiv'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" disabled={index === 0} onClick={() => moveFaq(faq, -1)} className="text-sm disabled:opacity-30">
                                ↑
                            </button>
                            <button type="button" disabled={index === faqs.length - 1} onClick={() => moveFaq(faq, 1)} className="text-sm disabled:opacity-30">
                                ↓
                            </button>
                            <Button variant="secondary" onClick={() => setFormOpen(faq)}>
                                Redaktə et
                            </Button>
                            <Button variant="danger" onClick={() => setDeleteTarget(faq)}>
                                Sil
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Sualı silmək istədiyinizə əminsiniz?"
                body={deleteTarget?.translation?.question}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
