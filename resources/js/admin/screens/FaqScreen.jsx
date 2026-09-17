import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Banner from '../components/Banner.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import FaqForm from './FaqForm.jsx';

export default function FaqScreen() {
    const { show } = useToast();
    const [faqs, setFaqs] = useState(null);
    const [pages, setPages] = useState([]);
    const [formOpen, setFormOpen] = useState(null); // null | 'new' | faq
    const [formErrors, setFormErrors] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [error, setError] = useState('');

    function load() {
        setError('');
        apiFetch('/faqs')
            .then((res) => setFaqs(res.data))
            .catch(() => setError('Sualları yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
        apiFetch('/pages')
            .then((res) => setPages(res.data))
            .catch(() => setError('Sualları yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
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
            <PageHeader title="Tez-tez verilən suallar" actions={<Button onClick={() => setFormOpen('new')}>Yeni sual</Button>} />

            {formOpen && (
                <div className="mb-6">
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
                    <hr className="mt-6 border-neutral-200 dark:border-neutral-800" />
                </div>
            )}

            <Banner type="error">{error}</Banner>

            {faqs === null && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {faqs && faqs.length === 0 && <EmptyState title="Hələ heç bir sual yoxdur" body="Yeni sual əlavə edin." />}

            {faqs && faqs.length > 0 && (
                <Card>
                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {faqs.map((faq, index) => (
                            <li key={faq.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{faq.translation?.question}</p>
                                    <StatusBadge active={faq.is_active} />
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
                </Card>
            )}

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
