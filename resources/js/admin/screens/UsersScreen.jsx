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
import UserForm from './UserForm.jsx';

const ROLE_LABELS = { administrator: 'Administrator', editor: 'Redaktor' };

export default function UsersScreen() {
    const { show } = useToast();
    const [users, setUsers] = useState(null);
    const [formOpen, setFormOpen] = useState(null); // null | 'new' | user
    const [formErrors, setFormErrors] = useState({});
    const [formBanner, setFormBanner] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [error, setError] = useState('');

    function load() {
        setError('');
        apiFetch('/users')
            .then((res) => setUsers(res.users))
            .catch(() => setError('İstifadəçiləri yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, []);

    function openForm(target) {
        setFormOpen(target);
        setFormErrors({});
        setFormBanner('');
    }

    function closeForm() {
        setFormOpen(null);
        setFormErrors({});
        setFormBanner('');
    }

    async function saveUser(payload) {
        try {
            if (formOpen === 'new') {
                await apiFetch('/users', { method: 'POST', body: payload });
            } else {
                await apiFetch(`/users/${formOpen.id}`, { method: 'PUT', body: payload });
            }
            show('İstifadəçi yadda saxlanıldı', 'success');
            closeForm();
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                setFormErrors(err.errors || {});
                setFormBanner(err.message);
            }
        }
    }

    async function toggleActive(user) {
        try {
            await apiFetch(`/users/${user.id}`, { method: 'PUT', body: { is_active: !user.is_active } });
            show(user.is_active ? 'İstifadəçi deaktiv edildi' : 'İstifadəçi aktiv edildi', 'success');
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                show(err.message, 'error');
            }
        }
    }

    async function confirmDelete() {
        try {
            await apiFetch(`/users/${deleteTarget.id}`, { method: 'DELETE' });
            show('İstifadəçi silindi', 'success');
            setDeleteTarget(null);
            load();
        } catch (err) {
            setDeleteTarget(null);
            if (err instanceof ApiError) {
                show(err.message, 'error');
            }
        }
    }

    return (
        <div className="max-w-2xl">
            <PageHeader title="İstifadəçilər" actions={<Button onClick={() => openForm('new')}>Yeni istifadəçi</Button>} />
            <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                Administrator bütün bölmələri idarə edə bilər. Redaktor məzmunu idarə edə bilər, lakin istifadəçiləri görə bilməz.
            </p>

            {formOpen && (
                <div className="mb-4">
                    <UserForm
                        user={formOpen === 'new' ? null : formOpen}
                        errors={formErrors}
                        banner={formBanner}
                        onSave={saveUser}
                        onCancel={closeForm}
                    />
                </div>
            )}

            <Banner type="error">{error}</Banner>

            {users === null && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {users && users.length === 0 && <EmptyState title="Hələ heç bir istifadəçi yoxdur" body="Yeni istifadəçi əlavə edin." />}

            {users && users.length > 0 && (
                <Card>
                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {users.map((user) => (
                            <li key={user.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name}</p>
                                        <StatusBadge active={user.is_active} />
                                    </div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">@{user.username}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {user.roles.map((role) => (
                                            <span
                                                key={role}
                                                className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
                                            >
                                                {ROLE_LABELS[role] || role}
                                            </span>
                                        ))}
                                    </div>
                                    <Button variant="secondary" onClick={() => openForm(user)}>
                                        Redaktə et
                                    </Button>
                                    <Button variant="secondary" onClick={() => toggleActive(user)}>
                                        {user.is_active ? 'Deaktiv et' : 'Aktiv et'}
                                    </Button>
                                    <Button variant="danger" onClick={() => setDeleteTarget(user)}>
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
                title="Bu istifadəçini silmək istədiyinizə əminsiniz?"
                body={deleteTarget?.name}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
