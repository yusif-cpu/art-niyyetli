import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';
import TextField from '../components/TextField.jsx';
import TextArea from '../components/TextArea.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import PageEditorScreen from './PageEditorScreen.jsx';

export default function PagesScreen() {
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
                <Card>
                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {pages.map((page) => (
                            <li key={page.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                                <div>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{page.translation?.title}</p>
                                    <StatusBadge active={page.is_active} />
                                </div>
                                <Button variant="secondary" onClick={() => setOpenPageId(page.id)}>
                                    Redaktə et
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}
