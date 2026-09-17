import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import TextField from '../components/TextField.jsx';
import TextArea from '../components/TextArea.jsx';
import LocaleTabs from '../components/LocaleTabs.jsx';
import Toggle from '../components/Toggle.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PageSectionForm from './PageSectionForm.jsx';

function translationsToState(translations) {
    const byLocale = {};
    (translations || []).forEach((t) => {
        byLocale[t.locale] = { slug: t.slug, title: t.title, content: t.content };
    });

    return {
        az: byLocale.az || { slug: '', title: '', content: '' },
        en: byLocale.en || { slug: '', title: '', content: '' },
    };
}

export default function PageEditorScreen({ pageId, onBack }) {
    const { show } = useToast();
    const [page, setPage] = useState(null);
    const [locale, setLocale] = useState('az');
    const [fields, setFields] = useState(null);
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [banner, setBanner] = useState('');
    const [sectionForm, setSectionForm] = useState(null); // null | 'new' | section object

    function load() {
        apiFetch(`/pages/${pageId}`).then((res) => {
            setPage(res.data);
            setFields(translationsToState(res.data.translations || [res.data.translation].filter(Boolean)));
            setIsActive(res.data.is_active);
        });
    }

    useEffect(load, [pageId]);

    function updateField(field, value) {
        setFields((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));
    }

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        setBanner('');

        const translations = Object.entries(fields)
            .filter(([, t]) => t.slug || t.title || t.content)
            .map(([loc, t]) => ({ locale: loc, slug: t.slug, title: t.title, content: t.content }));

        try {
            await apiFetch(`/pages/${pageId}`, { method: 'PUT', body: { is_active: isActive, translations } });
            show('Yadda saxlanıldı', 'success');
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(err.errors);
                setBanner(err.message);
            }
        } finally {
            setSaving(false);
        }
    }

    async function saveSection(payload) {
        try {
            if (sectionForm === 'new') {
                await apiFetch(`/pages/${pageId}/sections`, { method: 'POST', body: payload });
            } else {
                await apiFetch(`/pages/sections/${sectionForm.id}`, { method: 'PUT', body: payload });
            }
            show('Bölmə yadda saxlanıldı', 'success');
            setSectionForm(null);
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                show(err.message, 'error');
            }
        }
    }

    async function moveSection(section, direction) {
        const sections = page.sections;
        const index = sections.findIndex((s) => s.id === section.id);
        const swapWith = sections[index + direction];
        if (!swapWith) return;

        await apiFetch(`/pages/${pageId}/sections/reorder`, {
            method: 'POST',
            body: {
                items: [
                    { id: section.id, sort_order: swapWith.sort_order },
                    { id: swapWith.id, sort_order: section.sort_order },
                ],
            },
        });
        load();
    }

    if (!page || !fields) {
        return <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>;
    }

    return (
        <div className="max-w-3xl space-y-4">
            <button type="button" onClick={onBack} className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
                ← Səhifələrə qayıt
            </button>

            <form onSubmit={save} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center justify-between">
                    <LocaleTabs active={locale} onChange={setLocale} />
                    <Toggle checked={isActive} onChange={setIsActive} label="Aktiv" />
                </div>

                <Banner type="error">{banner}</Banner>

                <TextField label="URL (slug)" value={fields[locale].slug} onChange={(v) => updateField('slug', v)} error={errors?.[`translations.0.slug`]?.[0]} />
                <TextField label="Başlıq" value={fields[locale].title} onChange={(v) => updateField('title', v)} error={errors?.[`translations.0.title`]?.[0]} />
                <TextArea label="Məzmun" rows={6} value={fields[locale].content} onChange={(v) => updateField('content', v)} />

                <div className="flex justify-end">
                    <Button type="submit" loading={saving}>
                        Yadda saxla
                    </Button>
                </div>
            </form>

            <div>
                <div className="mb-2 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Bölmələr</h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Bu səhifənin daxilindəki bölmələr</p>
                    </div>
                    <Button variant="secondary" onClick={() => setSectionForm('new')}>
                        Yeni bölmə
                    </Button>
                </div>

                {sectionForm && (
                    <div className="mb-4">
                        <PageSectionForm
                            section={sectionForm === 'new' ? null : sectionForm}
                            onSave={saveSection}
                            onCancel={() => setSectionForm(null)}
                        />
                    </div>
                )}

                <ul className="space-y-2">
                    {page.sections?.map((section, index) => (
                        <li key={section.id} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                            <div className="flex items-center gap-3">
                                {section.image_url && (
                                    <img src={section.image_url} alt="Bölmə şəkli" className="h-10 w-10 rounded object-cover" />
                                )}
                                <div>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{section.key}</p>
                                    <StatusBadge active={section.is_active} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" disabled={index === 0} onClick={() => moveSection(section, -1)} className="text-sm disabled:opacity-30">
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    disabled={index === page.sections.length - 1}
                                    onClick={() => moveSection(section, 1)}
                                    className="text-sm disabled:opacity-30"
                                >
                                    ↓
                                </button>
                                <Button variant="secondary" onClick={() => setSectionForm(section)}>
                                    Redaktə et
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
