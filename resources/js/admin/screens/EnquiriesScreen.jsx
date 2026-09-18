import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import EmptyState from '../components/EmptyState.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';
import Pagination from '../components/Pagination.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import EnquiryDetailScreen from './EnquiryDetailScreen.jsx';

const STATUS_LABELS = { new: 'Yeni', read: 'Oxunub', replied: 'Cavablandırılıb', closed: 'Bağlanıb' };
const SUBJECT_LABELS = {
    buy: 'Əsər almaq',
    general_contact: 'Ümumi əlaqə',
    artist_submission: 'Rəssam müraciəti',
    media: 'Media sorğusu',
    exhibition_invitation: 'Sərgi / dəvət',
    collaboration: 'Əməkdaşlıq',
    other: 'Digər',
};

export default function EnquiriesScreen({ enquiryRefreshSignal } = {}) {
    const [enquiries, setEnquiries] = useState(null);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [subject, setSubject] = useState('');
    const [search, setSearch] = useState('');
    const [openId, setOpenId] = useState(null);
    const [error, setError] = useState('');

    function load() {
        setError('');
        const params = new URLSearchParams({ page });
        if (status) params.set('status', status);
        if (subject) params.set('subject', subject);
        if (search) params.set('search', search);

        apiFetch('/enquiries?' + params.toString())
            .then((res) => {
                setEnquiries(res.data);
                setMeta(res.meta);
            })
            .catch(() => setError('Sorğuları yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'));
    }

    useEffect(load, [page, status, subject, search, enquiryRefreshSignal]);

    if (openId) {
        return (
            <EnquiryDetailScreen
                enquiryId={openId}
                onBack={() => {
                    setOpenId(null);
                    load();
                }}
            />
        );
    }

    return (
        <div>
            <PageHeader title="Sorğular" />

            <div className="mb-4 flex flex-wrap gap-2">
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
                <select
                    value={subject}
                    onChange={(e) => {
                        setPage(1);
                        setSubject(e.target.value);
                    }}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                >
                    <option value="">Bütün mövzular</option>
                    {Object.entries(SUBJECT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Ad, e-poçt və ya inventar kodu"
                    value={search}
                    onChange={(e) => {
                        setPage(1);
                        setSearch(e.target.value);
                    }}
                    className="min-w-[220px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
                />
            </div>

            <Banner type="error">{error}</Banner>

            {enquiries === null && !error && <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
            {enquiries && enquiries.length === 0 && <EmptyState title="Sorğu tapılmadı" body="Filtri dəyişməyi sınayın." />}

            {enquiries && enquiries.length > 0 && (
                <Card>
                    <ul className="-m-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                        {enquiries.map((enquiry) => (
                            <li
                                key={enquiry.id}
                                className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                                    enquiry.status === 'new' ? 'border-l-4 border-l-red-600' : ''
                                }`}
                            >
                                <div>
                                    <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                        {enquiry.name} — {enquiry.email}
                                        {enquiry.status === 'new' && (
                                            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white">
                                                Yeni
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {enquiry.subject && <>{enquiry.subject} · </>}
                                        {enquiry.artwork?.inventory_code} · {STATUS_LABELS[enquiry.status]} · {new Date(enquiry.created_at).toLocaleDateString('az')}
                                    </p>
                                </div>
                                <Button variant="secondary" onClick={() => setOpenId(enquiry.id)}>
                                    Bax
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
