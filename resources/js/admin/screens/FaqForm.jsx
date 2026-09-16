import { useState } from 'react';
import TextField from '../components/TextField.jsx';
import TextArea from '../components/TextArea.jsx';
import Toggle from '../components/Toggle.jsx';
import LocaleTabs from '../components/LocaleTabs.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';

function emptyTranslations(faq) {
    const byLocale = {};
    (faq?.translations || (faq?.translation ? [faq.translation] : [])).forEach((t) => {
        byLocale[t.locale] = { question: t.question, answer: t.answer };
    });

    return {
        az: byLocale.az || { question: '', answer: '' },
        en: byLocale.en || { question: '', answer: '' },
    };
}

export default function FaqForm({ faq, pages, onSave, onCancel, errors }) {
    const [pageId, setPageId] = useState(faq?.page_id || pages?.[0]?.id || '');
    const [isActive, setIsActive] = useState(faq?.is_active ?? true);
    const [locale, setLocale] = useState('az');
    const [translations, setTranslations] = useState(emptyTranslations(faq));

    function updateField(field, value) {
        setTranslations((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));
    }

    function submit(e) {
        e.preventDefault();

        const payloadTranslations = Object.entries(translations)
            .filter(([, t]) => t.question || t.answer)
            .map(([loc, t]) => ({ locale: loc, question: t.question, answer: t.answer }));

        onSave({
            page_id: Number(pageId),
            is_active: isActive,
            translations: payloadTranslations.length ? payloadTranslations : undefined,
        });
    }

    return (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
            <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700">Hansı səhifə</span>
                <select
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                >
                    {pages?.map((page) => (
                        <option key={page.id} value={page.id}>
                            {page.translation?.title}
                        </option>
                    ))}
                </select>
            </label>

            <Toggle checked={isActive} onChange={setIsActive} label="Aktiv" />
            <LocaleTabs active={locale} onChange={setLocale} />
            <Banner type="error">{errors?.translations?.[0]}</Banner>

            <TextField
                label="Sual"
                value={translations[locale].question}
                onChange={(v) => updateField('question', v)}
                error={errors?.[`translations.0.question`]?.[0]}
            />
            <TextArea label="Cavab" value={translations[locale].answer} onChange={(v) => updateField('answer', v)} />

            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onCancel}>
                    Ləğv et
                </Button>
                <Button type="submit">Yadda saxla</Button>
            </div>
        </form>
    );
}
