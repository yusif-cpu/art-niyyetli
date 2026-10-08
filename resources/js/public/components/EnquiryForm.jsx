import { useEffect, useId, useRef, useState } from 'react';
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

const EMPTY_FIELDS = { name: '', email: '', phone: '', message: '', website: '' };

/**
 * The enquiry form (POST /enquiries), on the contact page and on the artwork page. The server is the source of truth:
 * fields may be sent empty and its field errors are shown. With an artwork code the code is shown read-only, so the
 * visitor sees what they ask about (it is a prop, so a reset leaves it in place).
 *
 * Two message regions, never one element: an error is urgent (role="alert", signal-ink), a success is not (a polite
 * live region that is always in the DOM, so its text is announced when it appears). Success is plain ink in a 1px
 * line, no Signal, no green, no icon. It shows only after the API has answered with success; then every field is
 * emptied, the errors are cleared, `onSuccess` tells the page (the contact page resets its own subject), and the
 * focus moves to the message. The button stays disabled until the visitor types in any field, which also clears the
 * message (no timer). On a failure nothing is reset. A 429 keeps its message and a disabled button. The submit button
 * is the only filled one: wine with wine-ink.
 */
export default function EnquiryForm({ subject, artworkCode, onSuccess }) {
    const { locale } = useLocale();
    const [fields, setFields] = useState(EMPTY_FIELDS);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState('idle'); // idle | submitting | success | rate-limited
    const [banner, setBanner] = useState(''); // the error / rate-limit text (role="alert")
    const successRef = useRef(null);

    // The focus goes to the message in the commit that shows it (not a frame later: a click into a field in between
    // would lose its typing to the message). Success is only reached by a send, so this runs once per send.
    useEffect(() => {
        if (status === 'success') successRef.current?.focus();
    }, [status]);
    // A second submit in the same tick (a double click, Enter twice) would still see the old `status`.
    const sending = useRef(false);

    // The subject is a field too, but it lives on the contact page: changing it after a success counts as touching
    // the form. The page's own reset (onSuccess) changes it in the same render as the success, so the subject seen
    // first in the success state is the starting point, and only a later change clears the message.
    const successSubject = useRef(undefined);
    useEffect(() => {
        if (status !== 'success') {
            successSubject.current = undefined;
        } else if (successSubject.current === undefined) {
            successSubject.current = subject;
        } else if (subject !== successSubject.current) {
            setStatus('idle');
        }
    }, [status, subject]);

    // Tab order, so focus lands on whichever invalid field the visitor would reach first — client-side required
    // checks and server-side field errors (422) both resolve through the same map.
    const fieldRefs = { artwork_code: useRef(null), name: useRef(null), email: useRef(null), phone: useRef(null), message: useRef(null) };
    function focusFirstError(errorsByField) {
        const firstKey = Object.keys(fieldRefs).find((key) => errorsByField[key]?.length);
        fieldRefs[firstKey]?.current?.focus();
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (sending.current || status === 'submitting' || status === 'success' || status === 'rate-limited') return;

        const required = { name: fields.name, email: fields.email, message: fields.message };
        const validationErrors = Object.fromEntries(
            Object.entries(required).filter(([, value]) => value.trim() === '').map(([key]) => [key, [t(locale, 'enquiryForm.required')]])
        );
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setBanner('');
            focusFirstError(validationErrors);

            return;
        }

        sending.current = true;
        setStatus('submitting');
        setErrors({});
        setBanner('');

        try {
            await submitEnquiry({ ...fields, subject, artwork_code: artworkCode });
            setFields(EMPTY_FIELDS);
            setStatus('success');
            onSuccess?.();
        } catch (err) {
            if (err instanceof PublicApiError && err.isRateLimited) {
                setStatus('rate-limited');
                setBanner(t(locale, 'enquiryForm.rateLimited'));
            } else if (err instanceof PublicApiError) {
                setStatus('idle');
                setErrors(err.errors || {});
                setBanner(err.message);
                focusFirstError(err.errors || {});
            } else {
                setStatus('idle');
                setBanner(t(locale, 'common.error'));
            }
        } finally {
            sending.current = false;
        }
    }

    const disabled = status === 'submitting' || status === 'rate-limited' || status === 'success';
    const errorOf = (key) => errors[key]?.[0];
    // Typing in any field after a success clears the message and opens the button again: one action, two results.
    const set = (key) => (e) => {
        setFields({ ...fields, [key]: e.target.value });
        if (status === 'success') setStatus('idle');
    };
    const success = status === 'success';

    return (
        // aria-busy while sending, as the page skeletons do while loading; the disabled button blocks a second send.
        <form onSubmit={handleSubmit} className="flex flex-col font-ui" aria-busy={status === 'submitting' ? 'true' : undefined} noValidate>
            {/* The two regions take no room while empty (the form's gaps are on the field group below), so the
                layout is the same as before when there is no message. */}
            <div
                ref={successRef}
                role="status"
                aria-live="polite"
                tabIndex={-1}
                data-testid="enquiry-success"
                className={success ? 'mb-step-4 border border-line px-step-4 py-step-3 text-ui text-ink outline-none' : 'outline-none'}
            >
                {success ? t(locale, 'enquiryForm.success') : ''}
            </div>
            {banner && (
                <p role="alert" className="mb-step-4 text-ui text-signal-ink">
                    {banner}
                </p>
            )}

            <div className="flex flex-col gap-step-4">
                {artworkCode && (
                    <Field label={t(locale, 'enquiryForm.artworkCode')} error={errorOf('artwork_code')}>
                        {(props) => <input {...props} ref={fieldRefs.artwork_code} value={artworkCode} readOnly className={`${props.className} figures text-ink-muted`} />}
                    </Field>
                )}

                <Field label={t(locale, 'enquiryForm.name')} error={errorOf('name')}>
                    {(props) => <input {...props} ref={fieldRefs.name} value={fields.name} onChange={set('name')} autoComplete="name" />}
                </Field>

                <Field label={t(locale, 'enquiryForm.email')} error={errorOf('email')}>
                    {(props) => <input {...props} ref={fieldRefs.email} type="email" value={fields.email} onChange={set('email')} autoComplete="email" />}
                </Field>

                <Field label={t(locale, 'enquiryForm.phone')} error={errorOf('phone')}>
                    {(props) => <input {...props} ref={fieldRefs.phone} type="tel" value={fields.phone} onChange={set('phone')} autoComplete="tel" />}
                </Field>

                <Field label={t(locale, 'enquiryForm.message')} error={errorOf('message')}>
                    {(props) => <textarea {...props} ref={fieldRefs.message} rows={5} value={fields.message} onChange={set('message')} />}
                </Field>

                {/* Honeypot: a real field moved off-screen (never display:none/type=hidden, which bots skip), out of the Tab
                    order and hidden from screen readers. Only bots should fill it: a screen-reader user who found and
                    filled it would have their enquiry counted as spam. An accessibility linter may flag a focusable field
                    under aria-hidden; here that is a false signal (tabIndex={-1}, no label, never reached by keyboard). */}
                <div className="honeypot" aria-hidden="true" data-testid="honeypot">
                    <input name="website" tabIndex={-1} autoComplete="off" value={fields.website} onChange={set('website')} />
                </div>

                <div>
                    <button type="submit" disabled={disabled} className="cursor-pointer bg-wine px-step-5 py-step-3 text-ui text-wine-ink transition-opacity duration-[120ms] ease-standard disabled:cursor-default disabled:opacity-50">
                        {t(locale, 'enquiryForm.submit')}
                    </button>
                </div>
            </div>
        </form>
    );
}
