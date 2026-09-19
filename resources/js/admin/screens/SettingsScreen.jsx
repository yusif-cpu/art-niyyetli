import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import TextField from '../components/TextField.jsx';
import TextArea from '../components/TextArea.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';
import MediaPicker from '../components/MediaPicker.jsx';

const DISPLAY_MODE_LABELS = {
    logo_text: 'Loqo + mətn',
    logo_only: 'Yalnız loqo',
    text_only: 'Yalnız mətn',
};

const SECTIONS = [
    {
        label: 'Əlaqə',
        fields: [
            { key: 'contact_email', label: 'Əlaqə e-poçtu', type: 'text' },
            { key: 'phone', label: 'Telefon', type: 'text' },
            { key: 'address', label: 'Ünvan', type: 'textarea' },
            { key: 'opening_hours', label: 'İş saatları', type: 'textarea' },
        ],
    },
    {
        label: 'Sayt',
        fields: [{ key: 'footer_text', label: 'Alt yazı mətni', type: 'textarea' }],
    },
    {
        label: 'WhatsApp',
        fields: [{ key: 'whatsapp_number', label: 'WhatsApp nömrəsi', type: 'text' }],
    },
];

export default function SettingsScreen() {
    const { show } = useToast();
    const [values, setValues] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        apiFetch('/settings').then((res) => setValues(res.data));
    }, []);

    function updateValue(key, value) {
        setValues((current) => ({ ...current, [key]: value }));
    }

    async function submit(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        try {
            const res = await apiFetch('/settings', { method: 'PUT', body: values });
            setValues(res.data);
            show('Ayarlar yadda saxlanıldı', 'success');
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(err.errors);
            }
        } finally {
            setSaving(false);
        }
    }

    if (!values) {
        return <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>;
    }

    return (
        <form onSubmit={submit} className="max-w-xl space-y-4">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Sayt ayarları</h1>
            <Banner type="error">{Object.values(errors)[0]?.[0]}</Banner>

            <div className="space-y-4">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Brendinq</h2>
                <div>
                    <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Loqo</span>
                    <MediaPicker
                        value={values.logo_media_id}
                        previewUrl={values.logo_url}
                        onChange={(id, url) => setValues((current) => ({ ...current, logo_media_id: id, logo_url: url }))}
                    />
                </div>
                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Görünüş rejimi</span>
                    <select
                        value={values.logo_display_mode || 'logo_text'}
                        onChange={(e) => updateValue('logo_display_mode', e.target.value)}
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                    >
                        {Object.entries(DISPLAY_MODE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <TextField
                    label="Brend mətni"
                    value={values.brand_text}
                    onChange={(v) => updateValue('brand_text', v)}
                    error={errors.brand_text?.[0]}
                />
            </div>

            {SECTIONS.map((section) => (
                <div key={section.label} className="space-y-4">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{section.label}</h2>
                    {section.fields.map((field) => {
                        const Field = field.type === 'textarea' ? TextArea : TextField;

                        return (
                            <Field
                                key={field.key}
                                label={field.label}
                                value={values[field.key]}
                                onChange={(v) => setValues((current) => ({ ...current, [field.key]: v }))}
                                error={errors[field.key]?.[0]}
                            />
                        );
                    })}
                </div>
            ))}

            <Button type="submit" loading={saving}>
                Yadda saxla
            </Button>
        </form>
    );
}
