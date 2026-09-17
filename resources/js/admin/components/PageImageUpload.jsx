import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import Button from './Button.jsx';
import Banner from './Banner.jsx';

function previewUrlFromVariants(variants) {
    const order = ['detail-webp', 'detail-jpeg', 'thumbnail-webp', 'thumbnail-jpeg'];
    for (const variant of order) {
        const match = variants?.find((v) => v.variant === variant);
        if (match?.url) return match.url;
    }

    return null;
}

function thumbUrl(item) {
    const variant = item.variants?.find((v) => v.variant === 'thumbnail-webp') || item.variants?.find((v) => v.variant === 'thumbnail-jpeg');

    return variant?.url || null;
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

export default function PageImageUpload({ value, previewUrl, onChange }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [libraryItems, setLibraryItems] = useState([]);
    const [libraryLoading, setLibraryLoading] = useState(false);

    useEffect(() => {
        if (!libraryOpen) return;

        setLibraryLoading(true);
        apiFetch('/media?type=image&per_page=24')
            .then((res) => setLibraryItems(res.data || []))
            .finally(() => setLibraryLoading(false));
    }, [libraryOpen]);

    async function uploadFile(file) {
        setUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await apiFetch('/media', { method: 'POST', body: formData });
            onChange(res.data.id, previewUrlFromVariants(res.data.variants));
        } catch (err) {
            if (err instanceof ApiError) {
                setError(explainUploadError(err.message));
            }
        } finally {
            setUploading(false);
        }
    }

    return (
        <div>
            <div className="flex items-center gap-3">
                {value && previewUrl ? (
                    <img src={previewUrl} alt="Seçilmiş şəkil" className="h-16 w-16 rounded object-cover" />
                ) : (
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Şəkil əlavə edilməyib</span>
                )}
                <Button variant="secondary" onClick={() => setLibraryOpen(true)}>
                    Media-dan seç
                </Button>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} loading={uploading} disabled={uploading}>
                    Kompüterdən yüklə
                </Button>
                {value && (
                    <Button variant="secondary" onClick={() => onChange(null, null)} disabled={uploading}>
                        Sil
                    </Button>
                )}
            </div>

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

            <div className="mt-2">
                <Banner type="error">{error}</Banner>
            </div>

            {libraryOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60">
                    <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-neutral-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Media seçin</h2>
                            <Button variant="secondary" onClick={() => setLibraryOpen(false)}>
                                Bağla
                            </Button>
                        </div>
                        {libraryLoading && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
                        {!libraryLoading && libraryItems.length === 0 && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Media kitabxanası boşdur.</p>
                        )}
                        <div className="grid grid-cols-4 gap-3">
                            {libraryItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(item.id, thumbUrl(item));
                                        setLibraryOpen(false);
                                    }}
                                    className="aspect-square overflow-hidden rounded border border-neutral-200 hover:ring-2 hover:ring-neutral-400 dark:border-neutral-800"
                                >
                                    {thumbUrl(item) ? (
                                        <img src={thumbUrl(item)} alt="Media" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="flex h-full items-center justify-center text-xs text-neutral-400">Şəkil yoxdur</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
