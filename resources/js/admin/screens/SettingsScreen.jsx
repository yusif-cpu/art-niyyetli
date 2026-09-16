import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import TextField from '../components/TextField.jsx';
import TextArea from '../components/TextArea.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';

const FIELDS = [
    { key: 'contact_email', label: 'Əlaqə e-poçtu', type: 'text' },
    { key: 'phone', label: 'Telefon', type: 'text' },
    { key: 'address', label: 'Ünvan', type: 'textarea' },
    { key: 'opening_hours', label: 'İş saatları', type: 'textarea' },
    { key: 'footer_text', label: 'Alt yazı mətni', type: 'textarea' },
];

export default function SettingsScreen() {
    const { show } = useToast();
    const [values, setValues] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        apiFetch('/settings').then((res) => setValues(res.data));
    }, []);

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
        return <p className="text-sm text-neutral-500">Yüklənir...</p>;
    }

    return (
        <form onSubmit={submit} className="max-w-xl space-y-4">
            <h1 className="text-lg font-semibold text-neutral-900">Sayt ayarları</h1>
            <Banner type="error">{Object.values(errors)[0]?.[0]}</Banner>

            {FIELDS.map((field) => {
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

            <Button type="submit" loading={saving}>
                Yadda saxla
            </Button>
        </form>
    );
}
