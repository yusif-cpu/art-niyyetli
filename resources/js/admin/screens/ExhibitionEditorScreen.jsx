import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import TextField from '../components/TextField.jsx';
import TextArea from '../components/TextArea.jsx';
import LocaleTabs from '../components/LocaleTabs.jsx';
import Toggle from '../components/Toggle.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import MediaListManager from '../components/MediaListManager.jsx';

const STATUS_LABELS = { current: 'Cari', past: 'Keçmiş', upcoming: 'Gələcək' };
const TYPE_LABELS = { exhibition: 'Sərgi', news: 'Xəbər', announcement: 'Elan' };
const MEDIA_TYPE_OPTIONS = [
    { value: 'photo', label: 'Foto' },
    { value: 'video', label: 'Video' },
];

const EMPTY_CORE = { type: 'exhibition', status: 'upcoming', start_date: '', end_date: '', is_active: true };

function translationsToState(translations) {
    const byLocale = {};
    (translations || []).forEach((t) => {
        byLocale[t.locale] = { slug: t.slug, title: t.title, venue: t.venue, short_text: t.short_text, full_text: t.full_text };
    });
    const empty = { slug: '', title: '', venue: '', short_text: '', full_text: '' };

    return { az: byLocale.az || empty, en: byLocale.en || empty };
}

export default function ExhibitionEditorScreen({ exhibitionId, onBack }) {
    const { show } = useToast();
    const isNew = !exhibitionId;

    const [loaded, setLoaded] = useState(isNew);
    const [locale, setLocale] = useState('az');
    const [fields, setFields] = useState(translationsToState(null));
    const [core, setCore] = useState(EMPTY_CORE);
    const [participants, setParticipants] = useState([]);
    const [artworks, setArtworks] = useState([]);
    const [media, setMedia] = useState([]);
    const [allArtists, setAllArtists] = useState([]);
    const [allArtworks, setAllArtworks] = useState([]);
    const [addArtistId, setAddArtistId] = useState('');
    const [addArtworkId, setAddArtworkId] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [banner, setBanner] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    useEffect(() => {
        apiFetch('/artists?per_page=100').then((res) => setAllArtists(res.data));
        apiFetch('/artworks?per_page=100').then((res) => setAllArtworks(res.data));
    }, []);

    function load() {
        if (isNew) {
            setLoaded(true);

            return;
        }

        apiFetch(`/exhibitions/${exhibitionId}`).then((res) => {
            const data = res.data;
            setFields(translationsToState(data.translations || [data.translation].filter(Boolean)));
            setCore({ type: data.type, status: data.status, start_date: data.start_date, end_date: data.end_date, is_active: data.is_active });
            setParticipants(data.artists || []);
            setArtworks(data.artworks || []);
            setMedia(data.media || []);
            setLoaded(true);
        });
    }

    useEffect(load, [exhibitionId]);

    function updateField(field, value) {
        setFields((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));
    }

    function updateCore(field, value) {
        setCore((current) => ({ ...current, [field]: value }));
    }

    function addParticipant() {
        if (!addArtistId || participants.some((p) => p.id === Number(addArtistId))) return;
        const artist = allArtists.find((a) => a.id === Number(addArtistId));
        setParticipants([...participants, { id: artist.id, name: `${artist.translation?.first_name} ${artist.translation?.last_name}` }]);
        setAddArtistId('');
    }

    function addArtwork() {
        if (!addArtworkId || artworks.some((a) => a.id === Number(addArtworkId))) return;
        const artwork = allArtworks.find((a) => a.id === Number(addArtworkId));
        setArtworks([...artworks, { id: artwork.id, title: artwork.translation?.title, inventory_code: artwork.inventory_code }]);
        setAddArtworkId('');
    }

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        setBanner('');

        const translations = Object.entries(fields)
            .filter(([, t]) => t.slug || t.title)
            .map(([loc, t]) => ({ locale: loc, ...t }));

        const payload = {
            ...core,
            translations,
            artists: participants.map((p, i) => ({ artist_id: p.id, sort_order: i })),
            artworks: artworks.map((a, i) => ({ artwork_id: a.id, sort_order: i })),
            media: media.map(({ media_id, type, sort_order }) => ({ media_id, type, sort_order })),
        };

        try {
            if (isNew) {
                await apiFetch('/exhibitions', { method: 'POST', body: payload });
                show('Sərgi uğurla yadda saxlanıldı', 'success');
                onBack();

                return;
            }

            await apiFetch(`/exhibitions/${exhibitionId}`, { method: 'PUT', body: payload });
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

    async function confirmDelete() {
        try {
            await apiFetch(`/exhibitions/${exhibitionId}`, { method: 'DELETE' });
            show('Sərgi silindi', 'success');
            onBack();
        } catch (err) {
            if (err instanceof ApiError) {
                show(err.message, 'error');
            }
        } finally {
            setDeleteConfirm(false);
        }
    }

    if (!loaded) {
        return <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>;
    }

    return (
        <div className="max-w-3xl space-y-4">
            <button type="button" onClick={onBack} className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
                ← Sərgilərə qayıt
            </button>

            <form onSubmit={save} className="space-y-4">
                <Banner type="error">{banner}</Banner>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Əsas məlumat</h2>
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Növ</span>
                        <select value={core.type} onChange={(e) => updateCore('type', e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
                            {Object.entries(TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Status</span>
                        <select value={core.status} onChange={(e) => updateCore('status', e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <TextField label="Başlama tarixi" type="date" value={core.start_date} onChange={(v) => updateCore('start_date', v)} error={errors.start_date?.[0]} />
                        <TextField label="Bitmə tarixi" type="date" value={core.end_date} onChange={(v) => updateCore('end_date', v)} error={errors.end_date?.[0]} />
                    </div>
                    <Toggle checked={core.is_active} onChange={(v) => updateCore('is_active', v)} label="Aktiv (saytda görünsün)" />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Təsvir (AZ / EN)</h2>
                        <LocaleTabs active={locale} onChange={setLocale} />
                    </div>
                    <TextField label="URL (slug)" value={fields[locale].slug} onChange={(v) => updateField('slug', v)} />
                    <TextField label="Başlıq" value={fields[locale].title} onChange={(v) => updateField('title', v)} />
                    <TextField label="Məkan" value={fields[locale].venue} onChange={(v) => updateField('venue', v)} />
                    <TextArea label="Qısa mətn" value={fields[locale].short_text} onChange={(v) => updateField('short_text', v)} />
                    <TextArea label="Tam mətn" rows={6} value={fields[locale].full_text} onChange={(v) => updateField('full_text', v)} />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">İştirakçı rəssamlar</h2>
                    <div className="flex gap-2">
                        <select value={addArtistId} onChange={(e) => setAddArtistId(e.target.value)} className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
                            <option value="">Rəssam seçin</option>
                            {allArtists.map((artist) => (
                                <option key={artist.id} value={artist.id}>
                                    {artist.translation?.first_name} {artist.translation?.last_name}
                                </option>
                            ))}
                        </select>
                        <Button type="button" variant="secondary" onClick={addParticipant}>
                            Əlavə et
                        </Button>
                    </div>
                    <ul className="space-y-1">
                        {participants.map((p) => (
                            <li key={p.id} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-800">
                                {p.name}
                                <button type="button" onClick={() => setParticipants(participants.filter((x) => x.id !== p.id))} className="text-red-600 hover:underline dark:text-red-400">
                                    Sil
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Sərgidəki əsərlər</h2>
                    <div className="flex gap-2">
                        <select value={addArtworkId} onChange={(e) => setAddArtworkId(e.target.value)} className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
                            <option value="">Əsər seçin</option>
                            {allArtworks.map((artwork) => (
                                <option key={artwork.id} value={artwork.id}>
                                    {artwork.translation?.title} ({artwork.inventory_code})
                                </option>
                            ))}
                        </select>
                        <Button type="button" variant="secondary" onClick={addArtwork}>
                            Əlavə et
                        </Button>
                    </div>
                    <ul className="space-y-1">
                        {artworks.map((a) => (
                            <li key={a.id} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-800">
                                {a.title} ({a.inventory_code})
                                <button type="button" onClick={() => setArtworks(artworks.filter((x) => x.id !== a.id))} className="text-red-600 hover:underline dark:text-red-400">
                                    Sil
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Media</h2>
                    <MediaListManager items={media} onChange={setMedia} typeOptions={MEDIA_TYPE_OPTIONS} />
                </section>

                <div className="flex items-center justify-between">
                    {!isNew && (
                        <Button type="button" variant="danger" onClick={() => setDeleteConfirm(true)}>
                            Sil
                        </Button>
                    )}
                    <div className="ml-auto flex gap-2">
                        <Button type="button" variant="secondary" onClick={onBack}>
                            Ləğv et
                        </Button>
                        <Button type="submit" loading={saving}>
                            Yadda saxla
                        </Button>
                    </div>
                </div>
            </form>

            <ConfirmDialog
                open={deleteConfirm}
                title="Bu sərgini silmək istədiyinizə əminsiniz?"
                body="Bu əməliyyat geri qaytarıla bilməz."
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm(false)}
            />
        </div>
    );
}
