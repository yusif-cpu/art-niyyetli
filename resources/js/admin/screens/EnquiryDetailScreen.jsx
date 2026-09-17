import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';
import Button from '../components/Button.jsx';
import TextField from '../components/TextField.jsx';
import TextArea from '../components/TextArea.jsx';
import Banner from '../components/Banner.jsx';

const STATUS_LABELS = { new: 'Yeni', read: 'Oxunub', replied: 'Cavablandırılıb', closed: 'Bağlanıb' };

export default function EnquiryDetailScreen({ enquiryId, onBack }) {
    const { show } = useToast();
    const [enquiry, setEnquiry] = useState(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const [replyOpen, setReplyOpen] = useState(false);
    const [replySubject, setReplySubject] = useState('');
    const [replyMessage, setReplyMessage] = useState('');
    const [replySending, setReplySending] = useState(false);
    const [replyError, setReplyError] = useState('');

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

    function openReplyForm() {
        setReplySubject(`Re: ${enquiry.inventory_code ?? enquiry.subject ?? 'Sorğu'}`);
        setReplyMessage('');
        setReplyError('');
        setReplyOpen(true);
    }

    function closeReplyForm() {
        setReplyOpen(false);
        setReplySubject('');
        setReplyMessage('');
        setReplyError('');
    }

    async function sendReply() {
        setReplySending(true);
        setReplyError('');
        try {
            await apiFetch(`/enquiries/${enquiryId}/reply`, {
                method: 'POST',
                body: { subject: replySubject, message: replyMessage },
            });
            show('Cavab göndərildi', 'success');
            closeReplyForm();
            load();
        } catch (err) {
            if (err instanceof ApiError) {
                setReplyError(err.message);
            }
        } finally {
            setReplySending(false);
        }
    }

    if (!enquiry) {
        return <p className="text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>;
    }

    const submittedAt = enquiry.submitted_at || enquiry.created_at;

    return (
        <div className="max-w-2xl space-y-4">
            <button type="button" onClick={onBack} className="text-sm text-neutral-500 hover:underline dark:text-neutral-400">
                ← Sorğulara qayıt
            </button>

            <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
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
                {enquiry.subject && (
                    <p>
                        <strong>Mövzu:</strong> {enquiry.subject}
                    </p>
                )}
                {enquiry.inventory_code && (
                    <p>
                        <strong>İnventar kodu:</strong> {enquiry.inventory_code}
                    </p>
                )}
                <p className="flex flex-wrap items-center gap-2">
                    <strong>Əsər:</strong> {enquiry.artwork?.title} ({enquiry.artwork?.inventory_code})
                    {enquiry.artwork && (
                        <button
                            type="button"
                            onClick={() => {
                                location.hash = 'artworks';
                            }}
                            className="text-sm text-neutral-500 hover:underline dark:text-neutral-400"
                        >
                            Əsərə keç
                        </button>
                    )}
                </p>
                <p>
                    <strong>Tarix:</strong> {new Date(submittedAt).toLocaleString('az')}
                </p>
                <p>
                    <strong>Mesaj:</strong>
                </p>
                <p className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3 dark:bg-neutral-800">{enquiry.message}</p>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">Status:</span>
                <select
                    value={enquiry.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
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

            <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                {!replyOpen && (
                    <Button variant="secondary" onClick={openReplyForm}>
                        Müştəriyə cavab yaz
                    </Button>
                )}

                {replyOpen && (
                    <div className="space-y-3">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            <strong>Alıcı:</strong> {enquiry.email}
                        </p>
                        <TextField label="Mövzu" value={replySubject} onChange={setReplySubject} />
                        <TextArea label="Mesaj" value={replyMessage} onChange={setReplyMessage} rows={5} />
                        <Banner>{replyError}</Banner>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={closeReplyForm} disabled={replySending}>
                                Ləğv et
                            </Button>
                            <Button loading={replySending} onClick={sendReply}>
                                Cavab göndər
                            </Button>
                        </div>
                    </div>
                )}

                {enquiry.replies?.length > 0 && (
                    <div className="space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Göndərilmiş cavablar</p>
                        {enquiry.replies.map((reply) => (
                            <div key={reply.id} className="rounded-md bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
                                <p className="font-medium">{reply.subject}</p>
                                <p className="whitespace-pre-wrap">{reply.message}</p>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                    {reply.status === 'failed'
                                        ? 'göndərilmədi'
                                        : reply.sent_at
                                          ? new Date(reply.sent_at).toLocaleString('az')
                                          : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
