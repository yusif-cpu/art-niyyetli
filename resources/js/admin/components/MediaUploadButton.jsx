import { useRef, useState } from 'react';
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

function explainUploadError(message) {
    if (/mime|extension|format|type/i.test(message || '')) {
        return 'Bu şəkil formatı dəstəklənmir. JPG, PNG və ya WebP istifadə edin.';
    }
    if (/max|size|kilobytes|large/i.test(message || '')) {
        return 'Bu şəkil həddindən artıq böyükdür.';
    }

    return message || 'Şəkli yükləmək mümkün olmadı.';
}

export default function MediaUploadButton({ label = 'Şəkil əlavə et', onUploaded }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    async function uploadFile(file) {
        setUploading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await apiFetch('/media', { method: 'POST', body: formData });
            onUploaded(res.data.id, previewUrlFromVariants(res.data.variants));
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
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} loading={uploading} disabled={uploading}>
                {label}
            </Button>

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
        </div>
    );
}
