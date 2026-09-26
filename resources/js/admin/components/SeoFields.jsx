import { useState } from 'react';
import TextField from './TextField.jsx';
import TextArea from './TextArea.jsx';
import LocaleTabs from './LocaleTabs.jsx';
import MediaPicker from './MediaPicker.jsx';
import Banner from './Banner.jsx';
import { SEO_DESCRIPTION_MAX, seoErrors } from '../lib/seo.js';

/**
 * Per-locale SEO override (title, description, share image) shared by the page, artwork, artist, exhibition and
 * article editors. Leave a locale's fields empty to use the automatic values; emptying them removes the override.
 * `value` and `onChange` use the state shape from lib/seo.js.
 */
export default function SeoFields({ value, onChange, errors }) {
    const [locale, setLocale] = useState('az');
    const current = value[locale];
    const fieldErrors = seoErrors(errors, locale);

    function update(patch) {
        onChange({ ...value, [locale]: { ...current, ...patch } });
    }

    return (
        <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">SEO (AZ / EN)</h2>
                <LocaleTabs active={locale} onChange={setLocale} />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Boş buraxsanız, sayt başlığı və təsviri avtomatik seçir. Doldurulmuş dəyərlər axtarış nəticələrində və paylaşımlarda istifadə olunur.
            </p>
            <Banner type="error">{fieldErrors.general}</Banner>
            <TextField label="SEO başlığı" value={current.title} onChange={(v) => update({ title: v })} error={fieldErrors.title} />
            <TextArea
                label={`SEO təsviri (${current.description.length}/${SEO_DESCRIPTION_MAX})`}
                rows={3}
                value={current.description}
                onChange={(v) => update({ description: v })}
                error={fieldErrors.description}
            />
            <div>
                <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Paylaşım şəkli</span>
                <MediaPicker
                    value={current.og_image_id}
                    previewUrl={current.og_image_url}
                    onChange={(id, url) => update({ og_image_id: id, og_image_url: url })}
                />
                {fieldErrors.og_image_id && <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{fieldErrors.og_image_id}</span>}
            </div>
        </section>
    );
}
