import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import SeoFields from '../components/SeoFields.jsx';
import { seoToState, seoToPayload } from '../lib/seo.js';
import { useToast } from '../components/ToastContext.jsx';
import TextField from '../components/TextField.jsx';
import TextArea from '../components/TextArea.jsx';
import LocaleTabs from '../components/LocaleTabs.jsx';
import Toggle from '../components/Toggle.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ArtworkImageManager from '../components/ArtworkImageManager.jsx';
import YoutubeVideoField from '../components/YoutubeVideoField.jsx';

const AVAILABILITY_LABELS = { available: 'Satışda', reserved: 'Rezerv edilib', sold: 'Satılıb' };

const EMPTY_CORE = {
    artist_id: '',
    medium_id: '',
    genre_id: '',
    year_created: new Date().getFullYear(),
    width_cm: '',
    height_cm: '',
    price: '',
    show_price: true,
    availability: 'available',
    year_sold: '',
    inventory_code: '',
    certificate: false,
    frame_condition: '',
    delivery_note: '',
    featured: false,
    show_on_wall: false,
    sort_order: 0,
    is_active: true,
    youtube_url: '',
};

function translationsToState(translations) {
    const byLocale = {};
    (translations || []).forEach((t) => {
        byLocale[t.locale] = { slug: t.slug, title: t.title, short_description: t.short_description, provenance: t.provenance };
    });

    return {
        az: byLocale.az || { slug: '', title: '', short_description: '', provenance: '' },
        en: byLocale.en || { slug: '', title: '', short_description: '', provenance: '' },
    };
}

function explainDeleteError(message) {
    if (message?.includes('Sold artworks')) return 'Satılmış əsərlər tarixi əhəmiyyətinə görə silinə bilməz. Onun yerinə deaktiv edin.';
    if (message?.includes('related enquiries')) return 'Bu əsərlə bağlı sorğular olduğu üçün silinə bilməz. Onun yerinə deaktiv edin.';

    return 'Bu əsəri silmək mümkün olmadı.';
}

export default function ArtworkEditorScreen({ artworkId, onBack }) {
    const { show } = useToast();
    const isNew = !artworkId;

    const [loaded, setLoaded] = useState(isNew);
    const [locale, setLocale] = useState('az');
    const [fields, setFields] = useState(translationsToState(null));
    const [core, setCore] = useState(EMPTY_CORE);
    const [images, setImages] = useState([]);
    const [seo, setSeo] = useState(seoToState(null));
    const [youtubeVideoId, setYoutubeVideoId] = useState(null);
    const [artists, setArtists] = useState([]);
    const [genres, setGenres] = useState([]);
    const [mediums, setMediums] = useState([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [banner, setBanner] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    useEffect(() => {
        apiFetch('/artists?per_page=100').then((res) => setArtists(res.data));
        apiFetch('/genres').then((res) => setGenres(res.data));
        apiFetch('/mediums').then((res) => setMediums(res.data));
    }, []);

    function load() {
        if (isNew) {
            setLoaded(true);

            return;
        }

        apiFetch(`/artworks/${artworkId}`).then((res) => {
            const data = res.data;
            setFields(translationsToState(data.translations || [data.translation].filter(Boolean)));
            setCore({
                artist_id: data.artist?.id ?? '',
                medium_id: data.medium?.id ?? '',
                genre_id: data.genre?.id ?? '',
                year_created: data.year_created,
                width_cm: data.width_cm,
                height_cm: data.height_cm,
                price: data.price,
                show_price: data.show_price,
                availability: data.availability,
                year_sold: data.year_sold ?? '',
                inventory_code: data.inventory_code,
                certificate: data.certificate,
                frame_condition: data.frame_condition ?? '',
                delivery_note: data.delivery_note ?? '',
                featured: data.featured,
                show_on_wall: data.show_on_wall,
                sort_order: data.sort_order,
                is_active: data.is_active,
                youtube_url: data.youtube_url ?? '',
            });
            setSeo(seoToState(data.seo));
            setImages(data.images || []);
            setYoutubeVideoId(data.youtube_video_id ?? null);
            setLoaded(true);
        });
    }

    useEffect(load, [artworkId]);

    function updateField(field, value) {
        setFields((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));
    }

    function updateCore(field, value) {
        setCore((current) => ({ ...current, [field]: value }));
    }

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        setBanner('');

        const translations = Object.entries(fields)
            .filter(([, t]) => t.slug || t.title || t.short_description || t.provenance)
            .map(([loc, t]) => ({ locale: loc, ...t }));

        const payload = {
            ...core,
            year_sold: core.year_sold === '' ? null : core.year_sold,
            inventory_code: core.inventory_code || undefined,
            translations,
            seo: seoToPayload(seo),
            images: images.map(({ id, media_id, type, sort_order, is_main }) => ({ id, media_id, type, sort_order, is_main })),
        };

        try {
            if (isNew) {
                await apiFetch('/artworks', { method: 'POST', body: payload });
                show('Əsər uğurla yadda saxlanıldı', 'success');
                onBack();

                return;
            }

            await apiFetch(`/artworks/${artworkId}`, { method: 'PUT', body: payload });
            show('Dəyişikliklər yadda saxlanıldı', 'success');
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(err.errors || {});
                const firstFieldError = Object.values(err.errors || {})[0]?.[0];
                setBanner(firstFieldError || err.message || 'Məlumatları yadda saxlamaq mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.');
            }
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        try {
            await apiFetch(`/artworks/${artworkId}`, { method: 'DELETE' });
            show('Əsər silindi', 'success');
            onBack();
        } catch (err) {
            if (err instanceof ApiError) {
                show(explainDeleteError(err.message), 'error');
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
                ← Əsərlərə qayıt
            </button>

            <form onSubmit={save} className="space-y-4">
                <Banner type="error">{banner}</Banner>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Əsas məlumat</h2>
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Rəssam</span>
                        <select
                            value={core.artist_id}
                            onChange={(e) => updateCore('artist_id', e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                        >
                            <option value="">Seçin</option>
                            {artists.map((artist) => (
                                <option key={artist.id} value={artist.id}>
                                    {artist.translation?.first_name} {artist.translation?.last_name}
                                </option>
                            ))}
                        </select>
                        {errors.artist_id && <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{errors.artist_id[0]}</span>}
                    </label>
                    <TextField
                        label="İnventar kodu (boş buraxsanız avtomatik veriləcək)"
                        value={core.inventory_code}
                        onChange={(v) => updateCore('inventory_code', v)}
                        error={errors.inventory_code?.[0]}
                    />
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Vəziyyət</span>
                        <select
                            value={core.availability}
                            onChange={(e) => updateCore('availability', e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                        >
                            {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    {core.availability === 'sold' && (
                        <TextField
                            label="Satıldığı il"
                            type="number"
                            value={core.year_sold}
                            onChange={(v) => updateCore('year_sold', v)}
                            error={errors.year_sold?.[0]}
                        />
                    )}
                    <Toggle checked={core.is_active} onChange={(v) => updateCore('is_active', v)} label="Aktiv (saytda görünsün)" />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Ölçü və texniki məlumat</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <TextField label="En (sm)" type="number" value={core.width_cm} onChange={(v) => updateCore('width_cm', v)} error={errors.width_cm?.[0]} />
                        <TextField label="Hündürlük (sm)" type="number" value={core.height_cm} onChange={(v) => updateCore('height_cm', v)} error={errors.height_cm?.[0]} />
                    </div>
                    <TextField label="İl" type="number" value={core.year_created} onChange={(v) => updateCore('year_created', v)} error={errors.year_created?.[0]} />
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Janr</span>
                        <select
                            value={core.genre_id}
                            onChange={(e) => updateCore('genre_id', e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                        >
                            <option value="">Seçin</option>
                            {genres.map((genre) => (
                                <option key={genre.id} value={genre.id}>
                                    {genre.name}
                                </option>
                            ))}
                        </select>
                        {errors.genre_id && <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{errors.genre_id[0]}</span>}
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Material/texnika</span>
                        <select
                            value={core.medium_id}
                            onChange={(e) => updateCore('medium_id', e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                        >
                            <option value="">Seçin</option>
                            {mediums.map((medium) => (
                                <option key={medium.id} value={medium.id}>
                                    {medium.name}
                                </option>
                            ))}
                        </select>
                        {errors.medium_id && <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{errors.medium_id[0]}</span>}
                    </label>
                    <Toggle checked={core.certificate} onChange={(v) => updateCore('certificate', v)} label="Sertifikat mövcuddur" />
                    <TextArea label="Çərçivə vəziyyəti" value={core.frame_condition} onChange={(v) => updateCore('frame_condition', v)} />
                    <TextArea label="Çatdırılma qeydi" value={core.delivery_note} onChange={(v) => updateCore('delivery_note', v)} />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Qiymət</h2>
                    <TextField label="Qiymət (AZN)" type="number" value={core.price} onChange={(v) => updateCore('price', v)} error={errors.price?.[0]} />
                    <Toggle checked={core.show_price} onChange={(v) => updateCore('show_price', v)} label="Qiyməti saytda göstər" />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Saytda görünüş</h2>
                    <div>
                        <Toggle checked={core.featured} onChange={(v) => updateCore('featured', v)} label="Seçilmişlərdə göstər" />
                    </div>
                    <div>
                        <Toggle checked={core.show_on_wall} onChange={(v) => updateCore('show_on_wall', v)} label="Divarda göstər" />
                    </div>
                    <TextField label="Sıralama" type="number" value={core.sort_order} onChange={(v) => updateCore('sort_order', v)} />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Şəkillər</h2>
                    <ArtworkImageManager images={images} onChange={setImages} />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">YouTube video</h2>
                    <YoutubeVideoField
                        url={core.youtube_url}
                        onChange={(v) => updateCore('youtube_url', v)}
                        videoId={youtubeVideoId}
                        error={errors.youtube_url?.[0]}
                    />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Təsvir (AZ / EN)</h2>
                        <LocaleTabs active={locale} onChange={setLocale} />
                    </div>
                    <Banner type="error">{errors?.translations?.[0] || Object.entries(errors).find(([k]) => k.startsWith('translations.'))?.[1]?.[0]}</Banner>
                    <TextField label="URL (slug)" value={fields[locale].slug} onChange={(v) => updateField('slug', v)} />
                    <TextField label="Başlıq" value={fields[locale].title} onChange={(v) => updateField('title', v)} />
                    <TextArea label="Qısa açıqlama" value={fields[locale].short_description} onChange={(v) => updateField('short_description', v)} />
                    <TextArea label="Mənşə (provenance)" value={fields[locale].provenance} onChange={(v) => updateField('provenance', v)} />
                </section>

                <SeoFields value={seo} onChange={setSeo} errors={errors} />

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
                title="Bu əsəri silmək istədiyinizə əminsiniz?"
                body="Bu əməliyyat geri qaytarıla bilməz."
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm(false)}
            />
        </div>
    );
}
