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
import YoutubeVideoField from '../components/YoutubeVideoField.jsx';
import MediaListManager from '../components/MediaListManager.jsx';

const STATUS_LABELS = { draft: 'Qaralama', published: 'Dərc edilib' };
const TYPE_LABELS = {
    interview: 'Müsahibə',
    video_project: 'Video layihə',
    art_article: 'Sənət məqaləsi',
    exhibition_review: 'Sərgi icmalı',
    news: 'Xəbər',
    announcement: 'Elan',
};

const EMPTY_CORE = { type: 'news', status: 'draft', published_at: '', is_active: true, youtube_url: '' };

function translationsToState(translations) {
    const byLocale = {};
    (translations || []).forEach((t) => {
        byLocale[t.locale] = { slug: t.slug, title: t.title, short_text: t.short_text, content: t.content };
    });
    const empty = { slug: '', title: '', short_text: '', content: '' };

    return { az: byLocale.az || empty, en: byLocale.en || empty };
}

export default function ArticleEditorScreen({ articleId, onBack }) {
    const { show } = useToast();
    const isNew = !articleId;

    const [loaded, setLoaded] = useState(isNew);
    const [locale, setLocale] = useState('az');
    const [fields, setFields] = useState(translationsToState(null));
    const [core, setCore] = useState(EMPTY_CORE);
    const [youtubeVideoId, setYoutubeVideoId] = useState(null);
    const [media, setMedia] = useState([]);
    const [seo, setSeo] = useState(seoToState(null));
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [banner, setBanner] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    function load() {
        if (isNew) {
            setLoaded(true);

            return;
        }

        apiFetch(`/articles/${articleId}`).then((res) => {
            const data = res.data;
            setFields(translationsToState(data.translations || [data.translation].filter(Boolean)));
            setCore({
                type: data.type,
                status: data.status,
                published_at: data.published_at ? data.published_at.slice(0, 10) : '',
                is_active: data.is_active,
                youtube_url: data.youtube_url ?? '',
            });
            setYoutubeVideoId(data.youtube_video_id ?? null);
            setSeo(seoToState(data.seo));
            setMedia((data.media || []).map((m) => ({ media_id: m.id, sort_order: m.sort_order, url: m.url })));
            setLoaded(true);
        });
    }

    useEffect(load, [articleId]);

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
            .filter(([, t]) => t.slug || t.title)
            .map(([loc, t]) => ({ locale: loc, ...t }));

        const payload = {
            ...core,
            published_at: core.published_at || null,
            translations,
            seo: seoToPayload(seo),
            media: media.map(({ media_id, sort_order }) => ({ media_id, sort_order })),
        };

        try {
            if (isNew) {
                await apiFetch('/articles', { method: 'POST', body: payload });
                show('Məqalə uğurla yadda saxlanıldı', 'success');
                onBack();

                return;
            }

            await apiFetch(`/articles/${articleId}`, { method: 'PUT', body: payload });
            show('Dəyişikliklər yadda saxlanıldı', 'success');
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(err.errors || {});
                setBanner(err.message || 'Məlumatları yadda saxlamaq mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.');
            }
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        try {
            await apiFetch(`/articles/${articleId}`, { method: 'DELETE' });
            show('Məqalə silindi', 'success');
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
                ← Məqalələrə qayıt
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
                        <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nəşr statusu</span>
                        <select value={core.status} onChange={(e) => updateCore('status', e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        {core.status === 'published' && (
                            <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">Bu məqalə saytda dərhal görünəcək.</span>
                        )}
                    </label>
                    <TextField label="Dərc tarixi" type="date" value={core.published_at} onChange={(v) => updateCore('published_at', v)} error={errors.published_at?.[0]} />
                    <Toggle checked={core.is_active} onChange={(v) => updateCore('is_active', v)} label="Aktiv (saytda görünsün)" />
                </section>

                <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Məzmun (AZ / EN)</h2>
                        <LocaleTabs active={locale} onChange={setLocale} />
                    </div>
                    <TextField label="URL (slug)" value={fields[locale].slug} onChange={(v) => updateField('slug', v)} />
                    <TextField label="Başlıq" value={fields[locale].title} onChange={(v) => updateField('title', v)} />
                    <TextArea label="Qısa mətn" value={fields[locale].short_text} onChange={(v) => updateField('short_text', v)} />
                    <TextArea label="Məzmun" rows={8} value={fields[locale].content} onChange={(v) => updateField('content', v)} />
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
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Media</h2>
                    <MediaListManager items={media} onChange={setMedia} />
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
                title={core.status === 'published' ? 'Dərc edilmiş məqaləni silmək istədiyinizə əminsiniz?' : 'Bu məqaləni silmək istədiyinizə əminsiniz?'}
                body="Bu əməliyyat geri qaytarıla bilməz. Silmək əvəzinə deaktiv etməyi düşünə bilərsiniz."
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm(false)}
            />
        </div>
    );
}
