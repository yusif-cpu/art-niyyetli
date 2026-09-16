import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import Button from '../components/Button.jsx';
import TextArea from '../components/TextArea.jsx';

const STATUS_LABELS = { new: 'Yeni', read: 'Oxunub', replied: 'Cavablandırılıb', closed: 'Bağlanıb' };

export default function EnquiryDetailScreen({ enquiryId, onBack }) {
    const { show } = useToast();
    const [enquiry, setEnquiry] = useState(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    function load() {
        apiFetch(`/enquiries/${enquiryId}`).then((res) => {
            setEnquiry(res.data);
            setNote(res.data.internal_note || '');
        });
    }

    useEffect(load, [enquiryId]);

    async function updateStatus(newStatus) {
        const res = await apiFetch(`/enquiries/${enquiryId}`, { method: 'PUT', body: { status: newStatus } });
        setEnquiry(res.data);
        show('Status yeniləndi', 'success');
    }

    async function saveNote() {
        setSaving(true);
        try {
            const res = await apiFetch(`/enquiries/${enquiryId}`, { method: 'PUT', body: { internal_note: note } });
            setEnquiry(res.data);
            show('Qeyd yadda saxlanıldı', 'success');
        } finally {
            setSaving(false);
        }
    }

    if (!enquiry) {
        return <p className="text-sm text-neutral-500">Yüklənir...</p>;
    }

    return (
        <div className="max-w-2xl space-y-4">
            <button type="button" onClick={onBack} className="text-sm text-neutral-500 hover:underline">
                ← Sorğulara qayıt
            </button>

            <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
                <p>
                    <strong>Ad:</strong> {enquiry.name}
                </p>
                <p>
                    <strong>E-poçt:</strong> {enquiry.email}
                </p>
                {enquiry.phone && (
                    <p>
                        <strong>Telefon:</strong> {enquiry.phone}
                    </p>
                )}
                <p>
                    <strong>Əsər:</strong> {enquiry.artwork?.title} ({enquiry.artwork?.inventory_code})
                </p>
                <p>
                    <strong>Tarix:</strong> {new Date(enquiry.created_at).toLocaleString('az')}
                </p>
                <p>
                    <strong>Mesaj:</strong>
                </p>
                <p className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3">{enquiry.message}</p>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500">Status:</span>
                <select
                    value={enquiry.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <TextArea label="Daxili qeyd" value={note} onChange={setNote} rows={4} />
                <div className="mt-2 flex justify-end">
                    <Button loading={saving} onClick={saveNote}>
                        Qeydi saxla
                    </Button>
                </div>
            </div>
        </div>
    );
}
