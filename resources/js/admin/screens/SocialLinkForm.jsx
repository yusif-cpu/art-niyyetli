import { useState } from 'react';
import TextField from '../components/TextField.jsx';
import Toggle from '../components/Toggle.jsx';
import Button from '../components/Button.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import { DISPLAY_MODE_LABELS } from '../lib/displayModes.js';

export default function SocialLinkForm({ link, onSave, onCancel, errors }) {
    const [platform, setPlatform] = useState(link?.platform || '');
    const [url, setUrl] = useState(link?.url || '');
    const [logoMediaId, setLogoMediaId] = useState(link?.logo_media_id ?? null);
    const [logoUrl, setLogoUrl] = useState(link?.logo_url ?? null);
    const [displayMode, setDisplayMode] = useState(link?.display_mode || 'logo_text');
    const [isActive, setIsActive] = useState(link?.is_active ?? true);

    function submit(e) {
        e.preventDefault();
        onSave({ platform, url, logo_media_id: logoMediaId, display_mode: displayMode, is_active: isActive });
    }

    return (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <TextField label="Platforma" value={platform} onChange={setPlatform} error={errors?.platform?.[0]} required />
            <TextField label="URL" value={url} onChange={setUrl} error={errors?.url?.[0]} required />

            <div>
                <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Loqo</span>
                <MediaPicker
                    value={logoMediaId}
                    previewUrl={logoUrl}
                    onChange={(id, previewUrl) => {
                        setLogoMediaId(id);
                        setLogoUrl(previewUrl);
                    }}
                />
                {errors?.logo_media_id?.[0] && <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{errors.logo_media_id[0]}</span>}
            </div>

            <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Görünüş rejimi</span>
                <select
                    value={displayMode}
                    onChange={(e) => setDisplayMode(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                >
                    {Object.entries(DISPLAY_MODE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                {errors?.display_mode?.[0] && <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{errors.display_mode[0]}</span>}
            </label>

            <Toggle checked={isActive} onChange={setIsActive} label="Aktiv" />

            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onCancel}>
                    Ləğv et
                </Button>
                <Button type="submit">Yadda saxla</Button>
            </div>
        </form>
    );
}
