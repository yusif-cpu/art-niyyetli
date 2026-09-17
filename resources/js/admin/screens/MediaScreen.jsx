import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Banner from '../components/Banner.jsx';
import Pagination from '../components/Pagination.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import TextField from '../components/TextField.jsx';
import PageHeader from '../components/PageHeader.jsx';

function thumbUrl(item) {
    return item.variants?.find((v) => v.variant === 'thumbnail-webp')?.url || item.variants?.find((v) => v.variant === 'thumbnail-jpeg')?.url || null;
}

function explainUploadError(message) {
    if (/mime|extension|format|type/i.test(message || '')) {
        return 'Bu şəkil formatı dəstəklənmir. JPG, PNG və ya WebP istifadə edin.';
    }
    if (/max|size|kilobytes|large/i.test(message || '')) {
        return 'Bu şəkil həddindən artıq böyükdür.';
    }

    return message || 'Şəkli yükləmək mümkün olmadı.';
}

export default function MediaScreen() {
    const { show } = useToast();
    const [items, setItems] = useState(null);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editingAlt, setEditingAlt] = useState(null);
    const fileInputRef = useRef(null);

    function load() {
        setError('');
        const params = new URLSearchParams({ page, type: 'image' });
        if (search) params.set('search', search);

        apiFetch('/media?' + params.toString())
            .then((res) => {
                setItems(res.data);
                setMeta(res.meta);
            })
            .catch(() => setError('Media kitabxanasını yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, [page, search]);

    async function uploadFile(file) {
        setUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', file);

        try {
            await apiFetch('/media', { method: 'POST', body: formData });
            show('Şəkil yükləndi', 'success');
            setPage(1);
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(explainUploadError(err.message));
            }
        } finally {
            setUploading(false);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file);
    }

    async function saveAltText(item, text) {
        try {
            await apiFetch(`/media/${item.id}`, { method: 'PUT', body: { alt_text: { az: text } } });
            show('Təsvir yeniləndi', 'success');
            setEditingAlt(null);
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                show(err.message, 'error');
            }
        }
    }

    async function confirmDelete() {
        try {
            await apiFetch(`/media/${deleteTarget.id}`, { method: 'DELETE' });
            show('Şəkil silindi', 'success');
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                show(err.message, 'error');
            }
        } finally {
            setDeleteTarget(null);
        }
    }

    return (
        <div>
            <PageHeader
                title="Media"
                actions={
                    <Button onClick={() => fileInputRef.current?.click()} loading={uploading}>
                        Şəkil yüklə
                    </Button>
                }
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file);
                    e.target.value = '';
                }}
            />

            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`mb-4 rounded-lg border-2 border-dashed p-6 text-center text-sm ${
                    dragOver
                        ? 'border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-800'
                        : 'border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'
                }`}
            >
                {uploading ? 'Yüklənir...' : 'Şəkli bura sürükləyin və ya "Şəkil yüklə" düyməsini istifadə edin.'}
            </div>

            <Banner type="error">{error}</Banner>

            <input
                type="text"
                placeholder="Fayl adı ilə axtar"
                value={search}
                onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                }}
                className="mb-4 w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
            />

            {items === null && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {items && items.length === 0 && <EmptyState title="Hələ heç bir şəkil yüklənməyib" body="Yuxarıdan ilk şəkli yükləyin." />}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items?.map((item) => (
                    <div key={item.id} className="rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="aspect-square overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                            {thumbUrl(item) ? (
                                <img src={thumbUrl(item)} alt={item.alt_text || ''} className="h-full w-full object-cover" />
                            ) : (
                                <span className="flex h-full items-center justify-center text-xs text-neutral-400">Önizləmə yoxdur</span>
                            )}
                        </div>
                        <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400" title={item.original_filename}>
                            {item.original_filename}
                        </p>

                        {editingAlt === item.id ? (
                            <div className="mt-1 space-y-1">
                                <TextField
                                    label="Təsvir (alt text)"
                                    value={item.alt_text || ''}
                                    onChange={(v) => setItems(items.map((i) => (i.id === item.id ? { ...i, alt_text: v } : i)))}
                                />
                                <div className="flex gap-1">
                                    <Button variant="secondary" onClick={() => saveAltText(item, item.alt_text)}>
                                        Saxla
                                    </Button>
                                    <Button variant="secondary" onClick={() => setEditingAlt(null)}>
                                        Ləğv et
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-1 flex justify-between">
                                <button type="button" onClick={() => setEditingAlt(item.id)} className="text-xs text-neutral-500 hover:underline dark:text-neutral-400">
                                    Təsviri redaktə et
                                </button>
                                <button type="button" onClick={() => setDeleteTarget(item)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                                    Sil
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Pagination meta={meta} onPageChange={setPage} />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Bu şəkli silmək istədiyinizə əminsiniz?"
                body={deleteTarget?.original_filename}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
