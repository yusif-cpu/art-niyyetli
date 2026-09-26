import { useState } from 'react';
import TextField from '../components/TextField.jsx';
import Toggle from '../components/Toggle.jsx';
import LocaleTabs from '../components/LocaleTabs.jsx';
import TextArea from '../components/TextArea.jsx';
import PageImageUpload from '../components/PageImageUpload.jsx';
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

// `supportedKeys`: the keys the public site relies on for this page (from the API); the sections that already hold
// one cannot be renamed, and the others are offered as suggestions when adding a section.
export default function PageSectionForm({ section, supportedKeys = [], onSave, onCancel, errors }) {
    const keyLocked = !!section && supportedKeys.includes(section.key);
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
            ...(keyLocked ? {} : { key }),
            is_active: isActive,
            media_id: mediaId,
            translations: payloadTranslations.length ? payloadTranslations : undefined,
        });
    }

    return (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <TextField
                label="Açar (key)"
                value={key}
                onChange={setKey}
                error={errors?.key?.[0]}
                required
                disabled={keyLocked}
                list={supportedKeys.length > 0 ? 'section-key-suggestions' : undefined}
            />
            {supportedKeys.length > 0 && (
                <datalist id="section-key-suggestions">
                    {supportedKeys.map((supported) => (
                        <option key={supported} value={supported} />
                    ))}
                </datalist>
            )}
            {keyLocked && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Bu açar ana səhifənin quruluşuna aiddir və dəyişdirilə bilməz.</p>
            )}
            {!keyLocked && supportedKeys.length > 0 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Ana səhifədə istifadə olunan açarlar: {supportedKeys.join(', ')}. Digər açarlar saytda göstərilmir.
                </p>
            )}
            <Toggle checked={isActive} onChange={setIsActive} label="Aktiv" />
            <div>
                <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Şəkil</span>
                <PageImageUpload
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
