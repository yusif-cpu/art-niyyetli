import { useId, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { submitEnquiry } from '../services/enquiries.js';
import { PublicApiError } from '../lib/api.js';

// Square fields (no radius, not even the input token here): raised surface, 1px line-strong, interface text.
const inputBase = 'mt-step-1 block min-h-11 w-full border bg-surface-raised px-step-3 py-step-2 text-ui text-ink';

/**
 * One labelled field. The label sits above in text-label / ink-muted; a server error turns the border signal-ink and
 * adds a text-caption message below, tied to the field with aria-describedby.
 */
function Field({ label, error, children }) {
    const id = useId();
    const errorId = `${id}-error`;

    return (
        <div>
            <label htmlFor={id} className="block text-label text-ink-muted">{label}</label>
            {children({ id, className: `${inputBase} ${error ? 'border-signal-ink' : 'border-line-strong'}`, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': error ? errorId : undefined })}
            {error && <p id={errorId} className="mt-step-1 text-caption text-signal-ink">{error}</p>}
        </div>
    );
}

/**
 * The enquiry form (POST /enquiries). The server is the source of truth: fields may be sent empty and its field
 * errors are shown. With an artwork code the code is shown read-only, so the visitor sees what they ask about.
 * Signal appears only as an error, never before the form is sent. Success is plain ink (no green, no icon); a 429
 * keeps its message and a disabled button. The submit button is the only filled one: wine with wine-ink.
 */
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
    const errorOf = (key) => errors[key]?.[0];
    const set = (key) => (e) => setFields({ ...fields, [key]: e.target.value });

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-step-4 font-ui" noValidate>
            {banner && (
                <p role={status === 'success' ? 'status' : 'alert'} className={`text-ui ${status === 'success' ? 'text-ink' : 'text-signal-ink'}`}>
                    {banner}
                </p>
            )}

            {artworkCode && (
                <Field label={t(locale, 'enquiryForm.artworkCode')} error={errorOf('artwork_code')}>
                    {(props) => <input {...props} value={artworkCode} readOnly className={`${props.className} figures text-ink-muted`} />}
                </Field>
            )}

            <Field label={t(locale, 'enquiryForm.name')} error={errorOf('name')}>
                {(props) => <input {...props} value={fields.name} onChange={set('name')} autoComplete="name" />}
            </Field>

            <Field label={t(locale, 'enquiryForm.email')} error={errorOf('email')}>
                {(props) => <input {...props} type="email" value={fields.email} onChange={set('email')} autoComplete="email" />}
            </Field>

            <Field label={t(locale, 'enquiryForm.phone')} error={errorOf('phone')}>
                {(props) => <input {...props} type="tel" value={fields.phone} onChange={set('phone')} autoComplete="tel" />}
            </Field>

            <Field label={t(locale, 'enquiryForm.message')} error={errorOf('message')}>
                {(props) => <textarea {...props} rows={5} value={fields.message} onChange={set('message')} />}
            </Field>

            {/* Honeypot: a real, tabbable field visually moved off-screen (never display:none/type=hidden, which bots skip). Left empty by real users. */}
            <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
                <label>
                    Leave this field empty
                    <input name="website" tabIndex={-1} autoComplete="off" value={fields.website} onChange={set('website')} />
                </label>
            </div>

            <div>
                <button type="submit" disabled={disabled} className="cursor-pointer bg-wine px-step-5 py-step-3 text-ui text-wine-ink transition-opacity duration-[120ms] ease-standard disabled:cursor-default disabled:opacity-50">
                    {t(locale, 'enquiryForm.submit')}
                </button>
            </div>
        </form>
    );
}
