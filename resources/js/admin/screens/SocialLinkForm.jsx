import { useState } from 'react';
import TextField from '../components/TextField.jsx';
import Toggle from '../components/Toggle.jsx';
import Button from '../components/Button.jsx';

export default function SocialLinkForm({ link, onSave, onCancel, errors }) {
    const [platform, setPlatform] = useState(link?.platform || '');
    const [url, setUrl] = useState(link?.url || '');
    const [isActive, setIsActive] = useState(link?.is_active ?? true);

    function submit(e) {
        e.preventDefault();
        onSave({ platform, url, is_active: isActive });
    }

    return (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <TextField label="Platforma" value={platform} onChange={setPlatform} error={errors?.platform?.[0]} required />
            <TextField label="URL" value={url} onChange={setUrl} error={errors?.url?.[0]} required />
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
