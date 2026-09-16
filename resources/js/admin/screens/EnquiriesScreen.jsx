import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import EmptyState from '../components/EmptyState.jsx';
import Button from '../components/Button.jsx';
import EnquiryDetailScreen from './EnquiryDetailScreen.jsx';

const STATUS_LABELS = { new: 'Yeni', read: 'Oxunub', replied: 'Cavablandırılıb', closed: 'Bağlanıb' };

export default function EnquiriesScreen() {
    const [enquiries, setEnquiries] = useState(null);
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [openId, setOpenId] = useState(null);

    function load() {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (search) params.set('search', search);
        apiFetch('/enquiries?' + params.toString()).then((res) => setEnquiries(res.data));
    }

    useEffect(load, [status, search]);

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
            <h1 className="mb-4 text-lg font-semibold text-neutral-900">Sorğular</h1>

            <div className="mb-4 flex flex-wrap gap-2">
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                >
                    <option value="">Bütün statuslar</option>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Ad, e-poçt və ya inventar kodu"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="min-w-[220px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
            </div>

            {enquiries && enquiries.length === 0 && <EmptyState title="Sorğu tapılmadı" body="Filtri dəyişməyi sınayın." />}

            <ul className="space-y-2">
                {enquiries?.map((enquiry) => (
                    <li key={enquiry.id} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3">
                        <div>
                            <p className="text-sm font-medium text-neutral-900">
                                {enquiry.name} — {enquiry.email}
                            </p>
                            <p className="text-xs text-neutral-500">
                                {enquiry.artwork?.inventory_code} · {STATUS_LABELS[enquiry.status]} · {new Date(enquiry.created_at).toLocaleDateString('az')}
                            </p>
                        </div>
                        <Button variant="secondary" onClick={() => setOpenId(enquiry.id)}>
                            Bax
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
