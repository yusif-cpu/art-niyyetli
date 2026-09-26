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
import CatalogTermForm from './CatalogTermForm.jsx';

/**
 * List + inline form for a slug/name/sort order/active catalogue term (genres and mediums share this).
 * `labels`: { title, newButton, saved, deleted, empty, confirmDelete, loadError }.
 */
export default function CatalogTermsScreen({ endpoint, labels }) {
    const { show } = useToast();
    const [terms, setTerms] = useState(null);
    const [formOpen, setFormOpen] = useState(null); // null | 'new' | term
    const [formErrors, setFormErrors] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [error, setError] = useState('');

    function load() {
        setError('');
        apiFetch(endpoint)
            .then((res) => setTerms(res.data))
            .catch(() => setError(labels.loadError));
    }

    useEffect(load, [endpoint]);

    async function saveTerm(payload) {
        try {
            if (formOpen === 'new') {
                await apiFetch(endpoint, { method: 'POST', body: payload });
            } else {
                await apiFetch(`${endpoint}/${formOpen.id}`, { method: 'PUT', body: payload });
            }
            show(labels.saved, 'success');
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
        try {
            await apiFetch(`${endpoint}/${deleteTarget.id}`, { method: 'DELETE' });
            show(labels.deleted, 'success');
            load();
        } catch (err) {
            // 409: still used by artworks; the API message says to deactivate it instead.
            show(err instanceof ApiError ? err.message : labels.loadError, 'error');
        }
        setDeleteTarget(null);
    }

    return (
        <div className="max-w-3xl">
            <PageHeader title={labels.title} actions={<Button onClick={() => setFormOpen('new')}>{labels.newButton}</Button>} />

            {formOpen && (
                <div className="mb-6">
                    <CatalogTermForm
                        key={formOpen === 'new' ? 'new' : formOpen.id}
                        term={formOpen === 'new' ? null : formOpen}
                        errors={formErrors}
                        onSave={saveTerm}
                        onCancel={() => {
                            setFormOpen(null);
                            setFormErrors({});
                        }}
                    />
                    <hr className="mt-6 border-neutral-200 dark:border-neutral-800" />
                </div>
            )}

            <Banner type="error">{error}</Banner>

            {terms === null && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {terms && terms.length === 0 && <EmptyState title={labels.empty} body={labels.newButton + ' düyməsindən istifadə edin.'} />}

            {terms && terms.length > 0 && (
                <Card>
                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {terms.map((term) => (
                            <li key={term.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{term.name}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {term.slug} · #{term.sort_order}
                                    </p>
                                    <StatusBadge active={term.is_active} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="secondary" onClick={() => setFormOpen(term)}>
                                        Redaktə et
                                    </Button>
                                    <Button variant="danger" onClick={() => setDeleteTarget(term)}>
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
                title={labels.confirmDelete}
                body={deleteTarget?.name}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
