import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Banner from '../components/Banner.jsx';
import Pagination from '../components/Pagination.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ArticleEditorScreen from './ArticleEditorScreen.jsx';

const STATUS_LABELS = { draft: 'Qaralama', published: 'Dərc edilib' };
const TYPE_LABELS = {
    interview: 'Müsahibə',
    video_project: 'Video layihə',
    art_article: 'Sənət məqaləsi',
    exhibition_review: 'Sərgi icmalı',
    news: 'Xəbər',
    announcement: 'Elan',
};

export default function ArticlesScreen() {
    const [articles, setArticles] = useState(null);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const [openId, setOpenId] = useState(null);

    function load() {
        setError('');
        const params = new URLSearchParams({ page });
        if (search) params.set('search', search);
        if (status) params.set('status', status);

        apiFetch('/articles?' + params.toString())
            .then((res) => {
                setArticles(res.data);
                setMeta(res.meta);
            })
            .catch(() => setError('Məqalələri yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, [page, search, status]);

    if (openId) {
        return (
            <ArticleEditorScreen
                articleId={openId === 'new' ? null : openId}
                onBack={() => {
                    setOpenId(null);
                    load();
                }}
            />
        );
    }

    return (
        <div>
            <PageHeader title="Məqalələr" actions={<Button onClick={() => setOpenId('new')}>Yeni məqalə</Button>} />

            <div className="mb-4 flex flex-wrap gap-2">
                <input
                    type="text"
                    placeholder="Başlıq ilə axtar"
                    value={search}
                    onChange={(e) => {
                        setPage(1);
                        setSearch(e.target.value);
                    }}
                    className="min-w-[220px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
                />
                <select
                    value={status}
                    onChange={(e) => {
                        setPage(1);
                        setStatus(e.target.value);
                    }}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                >
                    <option value="">Bütün statuslar</option>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <Banner type="error">{error}</Banner>

            {articles === null && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {articles && articles.length === 0 && (
                <EmptyState title="Hələ heç bir məqalə əlavə edilməyib" body="İlk məqaləni əlavə etmək üçün yuxarıdakı düyməni istifadə edin." />
            )}

            {articles && articles.length > 0 && (
                <Card>
                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {articles.map((article) => (
                            <li key={article.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div>
                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{article.translation?.title || 'Adsız məqalə'}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {TYPE_LABELS[article.type]} ·{' '}
                                        <span className={article.status === 'published' ? 'text-green-700' : 'text-neutral-500'}>{STATUS_LABELS[article.status]}</span>
                                    </p>
                                </div>
                                <Button variant="secondary" onClick={() => setOpenId(article.id)}>
                                    Redaktə et
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <Pagination meta={meta} onPageChange={setPage} />
        </div>
    );
}
