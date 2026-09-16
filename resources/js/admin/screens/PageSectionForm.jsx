import { useState } from 'react';
import TextField from '../components/TextField.jsx';
import Toggle from '../components/Toggle.jsx';
import LocaleTabs from '../components/LocaleTabs.jsx';
import TextArea from '../components/TextArea.jsx';
import MediaPicker from '../components/MediaPicker.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';

function emptyTranslations(section) {
    const byLocale = {};
    (section?.translations || (section?.translation ? [section.translation] : [])).forEach((t) => {
        byLocale[t.locale] = { heading: t.heading, body: t.body };
    });

    return {
        az: byLocale.az || { heading: '', body: '' },
        en: byLocale.en || { heading: '', body: '' },
    };
}

export default function PageSectionForm({ section, onSave, onCancel, errors }) {
    const [key, setKey] = useState(section?.key || '');
    const [isActive, setIsActive] = useState(section?.is_active ?? true);
    const [mediaId, setMediaId] = useState(section?.media_id ?? null);
    const [previewUrl, setPreviewUrl] = useState(section?.image_url ?? null);
    const [locale, setLocale] = useState('az');
    const [translations, setTranslations] = useState(emptyTranslations(section));

    function updateField(field, value) {
        setTranslations((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));
    }

    function submit(e) {
        e.preventDefault();

        const payloadTranslations = Object.entries(translations)
            .filter(([, t]) => t.heading || t.body)
            .map(([loc, t]) => ({ locale: loc, heading: t.heading, body: t.body }));

        onSave({
            key,
            is_active: isActive,
            media_id: mediaId,
            translations: payloadTranslations.length ? payloadTranslations : undefined,
        });
    }

    return (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
            <TextField label="Açar (key)" value={key} onChange={setKey} error={errors?.key?.[0]} required />
            <Toggle checked={isActive} onChange={setIsActive} label="Aktiv" />
            <div>
                <span className="mb-1 block text-sm font-medium text-neutral-700">Şəkil</span>
                <MediaPicker
                    value={mediaId}
                    previewUrl={previewUrl}
                    onChange={(id, url) => {
                        setMediaId(id);
                        setPreviewUrl(url);
                    }}
                />
            </div>

            <LocaleTabs active={locale} onChange={setLocale} />
            <Banner type="error">{errors?.translations?.[0]}</Banner>
            <TextField
                label="Başlıq"
                value={translations[locale].heading}
                onChange={(v) => updateField('heading', v)}
                error={errors?.[`translations.0.heading`]?.[0]}
            />
            <TextArea label="Mətn" value={translations[locale].body} onChange={(v) => updateField('body', v)} />

            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onCancel}>
                    Ləğv et
                </Button>
                <Button type="submit">Yadda saxla</Button>
            </div>
        </form>
    );
}
