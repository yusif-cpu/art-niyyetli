import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import TextField from '../components/TextField.jsx';
import TextArea from '../components/TextArea.jsx';
import LocaleTabs from '../components/LocaleTabs.jsx';
import Toggle from '../components/Toggle.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';
import MediaPicker from '../components/MediaPicker.jsx';

const EMPTY_CORE = { birth_year: '', sort_order: 0, is_active: true, representation_image_id: null };

function translationsToState(translations) {
    const byLocale = {};
    (translations || []).forEach((t) => {
        byLocale[t.locale] = {
            slug: t.slug,
            first_name: t.first_name,
            last_name: t.last_name,
            birth_place: t.birth_place || '',
            direction: t.direction || '',
            biography: t.biography || '',
            artistic_approach: t.artistic_approach || '',
        };
    });

    const empty = { slug: '', first_name: '', last_name: '', birth_place: '', direction: '', biography: '', artistic_approach: '' };

    return { az: byLocale.az || empty, en: byLocale.en || empty };
}

function repeaterToState(items, hasVenue) {
    return (items || []).map((item) => {
        const byLocale = {};
        item.translations.forEach((t) => {
            byLocale[t.locale] = hasVenue ? { title: t.title, venue: t.venue } : { title: t.title };
        });

        return {
            year: item.year,
            az: byLocale.az || (hasVenue ? { title: '', venue: '' } : { title: '' }),
            en: byLocale.en || (hasVenue ? { title: '', venue: '' } : { title: '' }),
        };
    });
}

function repeaterToPayload(rows, hasVenue) {
    return rows.map((row, index) => ({
        year: row.year,
        sort_order: index,
        translations: ['az', 'en']
            .filter((loc) => row[loc].title)
            .map((loc) => (hasVenue ? { locale: loc, title: row[loc].title, venue: row[loc].venue } : { locale: loc, title: row[loc].title })),
    }));
}

export default function ArtistEditorScreen({ artistId, onBack }) {
    const { show } = useToast();
    const isNew = !artistId;

    const [loaded, setLoaded] = useState(isNew);
    const [locale, setLocale] = useState('az');
    const [fields, setFields] = useState(translationsToState(null));
    const [core, setCore] = useState(EMPTY_CORE);
    const [portraitPreview, setPortraitPreview] = useState(null);
    const [exhibitions, setExhibitions] = useState([]);
    const [awards, setAwards] = useState([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [banner, setBanner] = useState('');

    function load() {
        if (isNew) {
            setLoaded(true);

            return;
        }

        apiFetch(`/artists/${artistId}`).then((res) => {
            const data = res.data;
            setFields(translationsToState(data.translations || [data.translation].filter(Boolean)));
            setCore({
                birth_year: data.birth_year ?? '',
                sort_order: data.sort_order,
                is_active: data.is_active,
                representation_image_id: data.representation_image_id,
            });
            setPortraitPreview(data.portrait_url);
            setExhibitions(repeaterToState(data.exhibitions, true));
            setAwards(repeaterToState(data.awards, false));
            setLoaded(true);
        });
    }

    useEffect(load, [artistId]);

    function updateField(field, value) {
        setFields((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));
    }

    function updateCore(field, value) {
        setCore((current) => ({ ...current, [field]: value }));
    }

    function updateRow(rows, setRows, index, loc, field, value) {
        setRows(rows.map((row, i) => (i === index ? { ...row, [loc]: { ...row[loc], [field]: value } } : row)));
    }

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        setBanner('');

        const translations = Object.entries(fields)
            .filter(([, t]) => t.slug || t.first_name || t.last_name)
            .map(([loc, t]) => ({ locale: loc, ...t }));

        const payload = {
            ...core,
            birth_year: core.birth_year === '' ? null : core.birth_year,
            translations,
            exhibitions: repeaterToPayload(exhibitions, true),
            awards: repeaterToPayload(awards, false),
        };

        try {
            if (isNew) {
                await apiFetch('/artists', { method: 'POST', body: payload });
                show('Rəssam uğurla yadda saxlanıldı', 'success');
                onBack();

                return;
            }

            await apiFetch(`/artists/${artistId}`, { method: 'PUT', body: payload });
            show('Dəyişikliklər yadda saxlanıldı', 'success');
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(err.errors || {});
                setBanner('Məlumatları yadda saxlamaq mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.');
            }
        } finally {
            setSaving(false);
        }
    }

    if (!loaded) {
        return <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>;
    }

    return (
        <div className="max-w-3xl space-y-4">
            <button type="button" onClick={onBack} className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
                ← Rəssamlara qayıt
            </button>

            <form onSubmit={save} className="space-y-4">
                <Banner type="error">{banner}</Banner>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Portret</h2>
                    <MediaPicker
                        value={core.representation_image_id}
                        previewUrl={portraitPreview}
                        onChange={(id, url) => {
                            updateCore('representation_image_id', id);
                            setPortraitPreview(url);
                        }}
                    />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Əsas məlumat</h2>
                    <TextField label="Doğum ili" type="number" value={core.birth_year} onChange={(v) => updateCore('birth_year', v)} error={errors.birth_year?.[0]} />
                    <TextField label="Sıralama" type="number" value={core.sort_order} onChange={(v) => updateCore('sort_order', v)} />
                    <Toggle checked={core.is_active} onChange={(v) => updateCore('is_active', v)} label="Aktiv (saytda görünsün)" />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Tərcümeyi-hal (AZ / EN)</h2>
                        <LocaleTabs active={locale} onChange={setLocale} />
                    </div>
                    <TextField label="URL (slug)" value={fields[locale].slug} onChange={(v) => updateField('slug', v)} error={errors[`translations.0.slug`]?.[0]} />
                    <div className="grid grid-cols-2 gap-3">
                        <TextField label="Ad" value={fields[locale].first_name} onChange={(v) => updateField('first_name', v)} />
                        <TextField label="Soyad" value={fields[locale].last_name} onChange={(v) => updateField('last_name', v)} />
                    </div>
                    <TextField label="Doğum yeri" value={fields[locale].birth_place} onChange={(v) => updateField('birth_place', v)} />
                    <TextField label="Yaradıcılıq istiqaməti" value={fields[locale].direction} onChange={(v) => updateField('direction', v)} />
                    <TextArea label="Bioqrafiya" rows={5} value={fields[locale].biography} onChange={(v) => updateField('biography', v)} />
                    <TextArea label="Yaradıcılıq yanaşması" rows={4} value={fields[locale].artistic_approach} onChange={(v) => updateField('artistic_approach', v)} />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Sərgilər</h2>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setExhibitions([...exhibitions, { year: new Date().getFullYear(), az: { title: '', venue: '' }, en: { title: '', venue: '' } }])}
                        >
                            Sərgi əlavə et
                        </Button>
                    </div>
                    {exhibitions.map((row, index) => (
                        <div key={index} className="space-y-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                            <div className="flex items-center gap-2">
                                <TextField
                                    label="İl"
                                    type="number"
                                    value={row.year}
                                    onChange={(v) => setExhibitions(exhibitions.map((r, i) => (i === index ? { ...r, year: v } : r)))}
                                />
                                <Button type="button" variant="danger" onClick={() => setExhibitions(exhibitions.filter((_, i) => i !== index))}>
                                    Sil
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <TextField label="Başlıq (AZ)" value={row.az.title} onChange={(v) => updateRow(exhibitions, setExhibitions, index, 'az', 'title', v)} />
                                <TextField label="Title (EN)" value={row.en.title} onChange={(v) => updateRow(exhibitions, setExhibitions, index, 'en', 'title', v)} />
                                <TextField label="Məkan (AZ)" value={row.az.venue} onChange={(v) => updateRow(exhibitions, setExhibitions, index, 'az', 'venue', v)} />
                                <TextField label="Venue (EN)" value={row.en.venue} onChange={(v) => updateRow(exhibitions, setExhibitions, index, 'en', 'venue', v)} />
                            </div>
                        </div>
                    ))}
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Mükafatlar</h2>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setAwards([...awards, { year: new Date().getFullYear(), az: { title: '' }, en: { title: '' } }])}
                        >
                            Mükafat əlavə et
                        </Button>
                    </div>
                    {awards.map((row, index) => (
                        <div key={index} className="space-y-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                            <div className="flex items-center gap-2">
                                <TextField
                                    label="İl"
                                    type="number"
                                    value={row.year}
                                    onChange={(v) => setAwards(awards.map((r, i) => (i === index ? { ...r, year: v } : r)))}
                                />
                                <Button type="button" variant="danger" onClick={() => setAwards(awards.filter((_, i) => i !== index))}>
                                    Sil
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <TextField label="Başlıq (AZ)" value={row.az.title} onChange={(v) => updateRow(awards, setAwards, index, 'az', 'title', v)} />
                                <TextField label="Title (EN)" value={row.en.title} onChange={(v) => updateRow(awards, setAwards, index, 'en', 'title', v)} />
                            </div>
                        </div>
                    ))}
                </section>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onBack}>
                        Ləğv et
                    </Button>
                    <Button type="submit" loading={saving}>
                        Yadda saxla
                    </Button>
                </div>
            </form>
        </div>
    );
}
