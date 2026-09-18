import { useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { useApiData } from '../lib/useApiData.js';
import { getEnquirySubjects } from '../services/enquiries.js';
import EnquiryForm from '../components/EnquiryForm.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function ContactPage() {
    const { locale } = useLocale();
    const { data: subjects, loading, error } = useApiData(() => getEnquirySubjects(locale), [locale]);
    const [selectedSubject, setSelectedSubject] = useState('');

    usePageMeta({ title: `${t(locale, 'contact.title')} — ArtNiyyətli` });

    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;

    const labeledSubjects = subjects.filter((item) => item.label);
    const subject = selectedSubject || labeledSubjects[0]?.key || '';

    return (
        <div className="mx-auto max-w-xl px-6 py-8">
            <h1 className="text-2xl font-semibold">{t(locale, 'contact.title')}</h1>

            <label className="mt-4 block text-sm">
                {t(locale, 'contact.subjectLabel')}
                <select
                    value={subject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
                >
                    {labeledSubjects.map((item) => (
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
