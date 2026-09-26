import { useState } from 'react';
import TextField from '../components/TextField.jsx';
import Toggle from '../components/Toggle.jsx';
import LocaleTabs from '../components/LocaleTabs.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';

function namesByLocale(term) {
    const byLocale = { az: '', en: '' };
    (term?.translations || []).forEach((t) => {
        byLocale[t.locale] = t.name;
    });

    return byLocale;
}

export default function CatalogTermForm({ term, onSave, onCancel, errors }) {
    const [slug, setSlug] = useState(term?.slug || '');
    const [sortOrder, setSortOrder] = useState(term?.sort_order ?? '');
    const [isActive, setIsActive] = useState(term?.is_active ?? true);
    const [locale, setLocale] = useState('az');
    const [names, setNames] = useState(namesByLocale(term));

    function submit(e) {
        e.preventDefault();

        onSave({
            slug,
            sort_order: sortOrder === '' ? undefined : Number(sortOrder),
            is_active: isActive,
            translations: Object.entries(names)
                .filter(([, name]) => name)
                .map(([loc, name]) => ({ locale: loc, name })),
        });
    }

    const nameIndex = Object.entries(names)
        .filter(([, name]) => name)
        .findIndex(([loc]) => loc === locale);

    return (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <TextField label="Slug" value={slug} onChange={setSlug} error={errors?.slug?.[0]} />
            <TextField label="Sıralama" type="number" min="0" value={sortOrder} onChange={setSortOrder} error={errors?.sort_order?.[0]} />
            <Toggle checked={isActive} onChange={setIsActive} label="Aktiv" />

            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Ad (AZ / EN)</h2>
                <LocaleTabs active={locale} onChange={setLocale} />
            </div>
            <Banner type="error">{errors?.translations?.[0]}</Banner>

            <TextField
                label="Ad"
                value={names[locale]}
                onChange={(v) => setNames((current) => ({ ...current, [locale]: v }))}
                error={nameIndex >= 0 ? errors?.[`translations.${nameIndex}.name`]?.[0] : undefined}
            />

            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onCancel}>
                    Ləğv et
                </Button>
                <Button type="submit">Yadda saxla</Button>
            </div>
        </form>
    );
}
