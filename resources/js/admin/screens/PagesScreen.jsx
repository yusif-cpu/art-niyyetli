import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';
import TextField from '../components/TextField.jsx';
import TextArea from '../components/TextArea.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PageEditorScreen from './PageEditorScreen.jsx';

const PLACEMENTS = [
    { value: 'header', label: 'Başlıq (əsas naviqasiya)' },
    { value: 'footer', label: 'Footer' },
    { value: 'none', label: 'Naviqasiyada göstərilmir' },
];

const PLACEMENT_GROUP_TITLES = {
    header: 'Başlıq (əsas naviqasiya)',
    footer: 'Footer',
    none: 'Naviqasiyada göstərilmir',
};

export default function PagesScreen() {
    const { show } = useToast();
    const [pages, setPages] = useState(null);
    const [openPageId, setOpenPageId] = useState(null);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [createFields, setCreateFields] = useState({ slug: '', title: '', content: '' });
    const [createErrors, setCreateErrors] = useState({});
    const [saving, setSaving] = useState(false);

    function load() {
        setError('');
        apiFetch('/pages')
            .then((res) => setPages(res.data))
            .catch(() => setError('Səhifələri yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, []);

    async function changePlacement(page, nav_placement) {
        try {
            await apiFetch(`/pages/${page.id}`, { method: 'PUT', body: { nav_placement } });
            show('Sıralamanı dəyiş', 'success');
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                show(err.message, 'error');
            }
        }
    }

    async function movePage(group, page, direction) {
        const index = group.findIndex((p) => p.id === page.id);
        const swapWith = group[index + direction];
        if (!swapWith) return;

        try {
            await apiFetch('/pages/reorder', {
                method: 'POST',
                body: {
                    items: [
                        { id: page.id, sort_order: swapWith.sort_order },
                        { id: swapWith.id, sort_order: page.sort_order },
                    ],
                },
            });
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                show(err.message, 'error');
            }
        }
    }

    function updateCreateField(field, value) {
        setCreateFields((current) => ({ ...current, [field]: value }));
    }

    async function createPage(e) {
        e.preventDefault();
        setSaving(true);
        setCreateErrors({});

        try {
            const res = await apiFetch('/pages', {
                method: 'POST',
                body: {
                    type: 'custom',
                    is_active: true,
                    translations: [{ locale: 'az', slug: createFields.slug, title: createFields.title, content: createFields.content }],
                },
            });
            setCreating(false);
            setCreateFields({ slug: '', title: '', content: '' });
            load();
            setOpenPageId(res.data.id);
        } catch (err) {
            if (err instanceof ApiError) {
                setCreateErrors(err.errors);
            }
        } finally {
            setSaving(false);
        }
    }

    if (openPageId) {
        return (
            <PageEditorScreen
                pageId={openPageId}
                onBack={() => {
                    setOpenPageId(null);
                    load();
                }}
            />
        );
    }

    return (
        <div>
            <PageHeader title="Səhifələr" actions={<Button onClick={() => setCreating(true)}>Yeni səhifə</Button>} />

            {creating && (
                <form onSubmit={createPage} className="mb-4 space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <TextField
                        label="URL (slug)"
                        value={createFields.slug}
                        onChange={(v) => updateCreateField('slug', v)}
                        error={createErrors?.['translations.0.slug']?.[0]}
                    />
                    <TextField
                        label="Başlıq"
                        value={createFields.title}
                        onChange={(v) => updateCreateField('title', v)}
                        error={createErrors?.['translations.0.title']?.[0]}
                    />
                    <TextArea label="Məzmun" rows={6} value={createFields.content} onChange={(v) => updateCreateField('content', v)} />

                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setCreating(false)}>
                            Ləğv et
                        </Button>
                        <Button type="submit" loading={saving}>
                            Yarat
                        </Button>
                    </div>
                </form>
            )}

            <Banner type="error">{error}</Banner>

            {!pages && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {pages && pages.length > 0 && (
                <div className="space-y-6">
                    {['header', 'footer', 'none'].map((placement) => {
                        const group = pages.filter((page) => page.nav_placement === placement);
                        if (group.length === 0) return null;

                        return (
                            <div key={placement}>
                                <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                    {PLACEMENT_GROUP_TITLES[placement]}
                                </h2>
                                <Card>
                                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                                        {group.map((page, index) => (
                                            <li key={page.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                                                <div>
                                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{page.translation?.title}</p>
                                                    <StatusBadge active={page.is_active} />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {placement !== 'none' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                aria-label="Yuxarı"
                                                                disabled={index === 0}
                                                                onClick={() => movePage(group, page, -1)}
                                                                className="text-sm disabled:opacity-30"
                                                            >
                                                                ↑
                                                            </button>
                                                            <button
                                                                type="button"
                                                                aria-label="Aşağı"
                                                                disabled={index === group.length - 1}
                                                                onClick={() => movePage(group, page, 1)}
                                                                className="text-sm disabled:opacity-30"
                                                            >
                                                                ↓
                                                            </button>
                                                        </>
                                                    )}
                                                    <select
                                                        aria-label="Naviqasiya yeri"
                                                        value={page.nav_placement}
                                                        onChange={(e) => changePlacement(page, e.target.value)}
                                                        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                                                    >
                                                        {PLACEMENTS.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <Button variant="secondary" onClick={() => setOpenPageId(page.id)}>
                                                        Redaktə et
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
