import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import Button from './Button.jsx';

function thumbUrl(item) {
    const variant = item.variants?.find((v) => v.variant === 'thumbnail-webp') || item.variants?.find((v) => v.variant === 'thumbnail-jpeg');

    return variant?.url || null;
}

export default function MediaPicker({ value, previewUrl, onChange }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;

        setLoading(true);
        apiFetch('/media?type=image&per_page=24')
            .then((res) => setItems(res.data || []))
            .finally(() => setLoading(false));
    }, [open]);

    return (
        <div>
            <div className="flex items-center gap-3">
                {value && previewUrl ? (
                    <img src={previewUrl} alt="Seçilmiş şəkil" className="h-16 w-16 rounded object-cover" />
                ) : (
                    <span className="text-sm text-neutral-500">Şəkil seçilməyib</span>
                )}
                <Button variant="secondary" onClick={() => setOpen(true)}>
                    Şəkil seç
                </Button>
                {value && (
                    <Button variant="secondary" onClick={() => onChange(null, null)}>
                        Şəkili sil
                    </Button>
                )}
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-semibold">Media seçin</h2>
                            <Button variant="secondary" onClick={() => setOpen(false)}>
                                Bağla
                            </Button>
                        </div>
                        {loading && <p className="text-sm text-neutral-500">Yüklənir...</p>}
                        <div className="grid grid-cols-4 gap-3">
                            {items.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(item.id, thumbUrl(item));
                                        setOpen(false);
                                    }}
                                    className="aspect-square overflow-hidden rounded border border-neutral-200 hover:ring-2 hover:ring-neutral-400"
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
