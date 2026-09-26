import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { submitEnquiry } from '../services/enquiries.js';
import { PublicApiError } from '../lib/api.js';

export default function EnquiryForm({ subject, artworkCode }) {
    const { locale } = useLocale();
    const [fields, setFields] = useState({ name: '', email: '', phone: '', message: '', website: '' });
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState('idle'); // idle | submitting | success | rate-limited
    const [banner, setBanner] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus('submitting');
        setErrors({});
        setBanner('');

        try {
            await submitEnquiry({ ...fields, subject, artwork_code: artworkCode });
            setStatus('success');
            setBanner(t(locale, 'enquiryForm.success'));
        } catch (err) {
            if (err instanceof PublicApiError && err.isRateLimited) {
                setStatus('rate-limited');
                setBanner(t(locale, 'enquiryForm.rateLimited'));
            } else if (err instanceof PublicApiError) {
                setStatus('idle');
                setErrors(err.errors || {});
                setBanner(err.message);
            } else {
                setStatus('idle');
                setBanner(t(locale, 'common.error'));
            }
        }
    }

    const disabled = status === 'submitting' || status === 'rate-limited' || status === 'success';

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {/* Error: signal-ink text (counts toward the Signal budget). Success: plain ink — there is no green. */}
            {banner && <p role={status === 'success' ? 'status' : 'alert'} className={`text-sm ${status === 'success' ? 'text-ink' : 'text-signal-ink'}`}>{banner}</p>}

            <label className="block text-sm">
                {t(locale, 'enquiryForm.name')}
                <input value={fields.name} aria-invalid={errors.name ? 'true' : undefined} onChange={(e) => setFields({ ...fields, name: e.target.value })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.name ? 'border-signal-ink' : 'border-neutral-300'}`} />
                {errors.name && <span className="text-xs text-signal-ink">{errors.name[0]}</span>}
            </label>

            <label className="block text-sm">
                {t(locale, 'enquiryForm.email')}
                <input type="email" value={fields.email} aria-invalid={errors.email ? 'true' : undefined} onChange={(e) => setFields({ ...fields, email: e.target.value })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.email ? 'border-signal-ink' : 'border-neutral-300'}`} />
                {errors.email && <span className="text-xs text-signal-ink">{errors.email[0]}</span>}
            </label>

            <label className="block text-sm">
                {t(locale, 'enquiryForm.phone')}
                <input value={fields.phone} onChange={(e) => setFields({ ...fields, phone: e.target.value })} className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2" />
            </label>

            <label className="block text-sm">
                {t(locale, 'enquiryForm.message')}
                <textarea value={fields.message} aria-invalid={errors.message ? 'true' : undefined} onChange={(e) => setFields({ ...fields, message: e.target.value })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.message ? 'border-signal-ink' : 'border-neutral-300'}`} />
                {errors.message && <span className="text-xs text-signal-ink">{errors.message[0]}</span>}
            </label>

            {/* Honeypot: a real, tabbable field visually moved off-screen (never display:none/type=hidden, which bots skip). Left empty by real users. */}
            <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
                <label>
                    Leave this field empty
                    <input name="website" tabIndex={-1} autoComplete="off" value={fields.website} onChange={(e) => setFields({ ...fields, website: e.target.value })} />
                </label>
            </div>

            <button type="submit" disabled={disabled} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {t(locale, 'enquiryForm.submit')}
            </button>
        </form>
    );
}
