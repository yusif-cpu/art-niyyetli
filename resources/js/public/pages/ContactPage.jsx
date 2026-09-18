import { useEffect, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { getEnquirySubjects } from '../services/enquiries.js';
import EnquiryForm from '../components/EnquiryForm.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function ContactPage() {
    const { locale } = useLocale();
    const [subjects, setSubjects] = useState(null);
    const [error, setError] = useState(null);
    const [subject, setSubject] = useState('');

    usePageMeta({ title: `${t(locale, 'contact.title')} — ArtNiyyətli` });

    useEffect(() => {
        getEnquirySubjects()
            .then((res) => {
                setSubjects(res.data);
                setSubject(res.data[0]?.key ?? '');
            })
            .catch((err) => setError(err));
    }, []);

    if (error) return <ErrorState error={error} />;
    if (subjects === null) return <LoadingState />;

    return (
        <div className="mx-auto max-w-xl px-6 py-8">
            <h1 className="text-2xl font-semibold">{t(locale, 'contact.title')}</h1>

            <label className="mt-4 block text-sm">
                {t(locale, 'contact.subjectLabel')}
                <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
                >
                    {subjects.map((item) => (
                        <option key={item.key} value={item.key}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </label>

            <div className="mt-6">
                <EnquiryForm subject={subject} />
            </div>
        </div>
    );
}
