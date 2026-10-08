import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';

// With more artists than this the artist choice becomes a <select>, otherwise an inline option list.
const ARTIST_LIST_MAX = 12;

// Options and fields are 44px touch targets (min-h-11), the text stays text-meta.
const optionClass = (selected) =>
    `inline-flex min-h-11 cursor-pointer items-center border px-step-3 text-meta transition-colors duration-[120ms] ease-standard ${selected ? 'border-line-strong text-ink' : 'border-line text-ink-muted hover:text-ink'}`;
const fieldClass = 'min-h-11 w-full rounded-input border border-line-strong bg-surface-raised px-step-2 py-step-1 text-meta text-ink';

/**
 * An inline single-choice list (the API filters on ONE genre / medium / artist, E7). Clicking the selected option
 * clears it. aria-pressed tells the state; the selection shows as a stronger border and ink, never a fill.
 */
function OptionList({ legend, options, value, onChange }) {
    if (options.length === 0) return null;

    return (
        <fieldset className="flex flex-col gap-step-2">
            <legend className="mb-step-2 text-label text-ink-muted">{legend}</legend>
            <div className="flex flex-wrap gap-step-2">
                {options.map((option) => {
                    const selected = value === option.value;

                    return (
                        <button key={option.value} type="button" aria-pressed={selected} onClick={() => onChange(selected ? undefined : option.value)} className={optionClass(selected)}>
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}

/**
 * Two number fields (at least / at most). Applied on blur or Enter, so typing does not fire a request per key.
 * `invalid`, when given, is a { min, max } pair read straight from the URL the visitor arrived with: `filters`
 * itself never holds an inconsistent range (parseQuery already dropped the max), so without it a URL like
 * ?price_min=500&price_max=100 would just show an empty max field with no explanation.
 */
function RangeFields({ legend, minKey, maxKey, filters, onChange, invalid, onErrorChange }) {
    const { locale } = useLocale();
    const applied = { min: filters[minKey] ?? '', max: filters[maxKey] ?? '' };
    const [draft, setDraft] = useState(() => (invalid ? { min: invalid.min, max: invalid.max } : applied));
    const [error, setError] = useState(() => Boolean(invalid));

    // Tell the page whether this range's error is on screen (it takes the Signal from the filter count).
    useEffect(() => {
        onErrorChange?.(minKey, error);
    }, [error, minKey, onErrorChange]);
    // This effect also fires once on mount (React runs every effect after the first render, not just on later
    // dependency changes) — which would otherwise immediately overwrite the invalid draft/error just initialized
    // above with `applied` (already stripped of its max by parseQuery), erasing the very message this exists to show.
    const skipNextSync = useRef(Boolean(invalid));

    // Follow the URL (Back, "clear filters"), but only when the applied values themselves change.
    useEffect(() => {
        if (skipNextSync.current) {
            skipNextSync.current = false;

            return;
        }
        setDraft({ min: applied.min, max: applied.max });
        setError(false);
    }, [applied.min, applied.max]);

    const commit = () => {
        if (draft.min !== '' && draft.max !== '' && Number(draft.max) < Number(draft.min)) {
            setError(true);

            return;
        }
        setError(false);
        const next = { [minKey]: draft.min === '' ? undefined : draft.min, [maxKey]: draft.max === '' ? undefined : draft.max };
        if (next[minKey] !== filters[minKey] || next[maxKey] !== filters[maxKey]) onChange(next);
    };
    const onKeyDown = (event) => {
        if (event.key === 'Enter') commit();
    };
    const errorId = `${minKey}-${maxKey}-error`;

    return (
        <fieldset className="flex flex-col gap-step-2">
            <legend className="mb-step-2 text-label text-ink-muted">{legend}</legend>
            <div className="grid grid-cols-2 gap-step-2">
                {[['min', minKey], ['max', maxKey]].map(([side, key]) => (
                    <label key={key} className="flex flex-col gap-step-1 text-caption text-ink-muted">
                        {t(locale, `filters.${side}`)}
                        <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            name={key}
                            value={draft[side]}
                            onChange={(event) => {
                                setError(false);
                                setDraft((current) => ({ ...current, [side]: event.target.value }));
                            }}
                            onBlur={commit}
                            onKeyDown={onKeyDown}
                            aria-invalid={error ? 'true' : undefined}
                            aria-describedby={error ? errorId : undefined}
                            className={`figures ${fieldClass} ${error ? 'border-signal-ink' : ''}`}
                        />
                    </label>
                ))}
            </div>
            {error && <p id={errorId} role="alert" className="text-caption text-signal-ink">{t(locale, 'filters.rangeInvalid')}</p>}
        </fieldset>
    );
}

/**
 * The catalogue filters. `filters` uses the API parameter names (genre, medium, artist, size_min, size_max,
 * price_min, price_max, status, sort); onChange receives a patch. `onRangeErrorChange(minKey, shown)` reports each
 * range's validation error, so the page can apply the Signal budget rule (an error on screen takes the Signal).
 */
export default function FilterBar({ filters, onChange, genres = [], mediums = [], artists = [], invalidRanges = {}, onRangeErrorChange }) {
    const { locale } = useLocale();
    const nameOf = (item) => item.name || item.slug;
    const artistName = (artist) => [artist.first_name, artist.last_name].filter(Boolean).join(' ');

    return (
        <div className="flex flex-col gap-step-6">
            <OptionList legend={t(locale, 'filters.genre')} value={filters.genre} options={genres.map((g) => ({ value: g.slug, label: nameOf(g) }))} onChange={(genre) => onChange({ genre })} />
            <OptionList legend={t(locale, 'filters.medium')} value={filters.medium} options={mediums.map((m) => ({ value: m.slug, label: nameOf(m) }))} onChange={(medium) => onChange({ medium })} />

            {artists.length > ARTIST_LIST_MAX ? (
                <label className="flex flex-col gap-step-2 text-label text-ink-muted">
                    {t(locale, 'filters.artist')}
                    <select value={filters.artist || ''} onChange={(event) => onChange({ artist: event.target.value || undefined })} className={fieldClass}>
                        <option value="">{t(locale, 'filters.all')}</option>
                        {artists.map((artist) => (
                            <option key={artist.id} value={String(artist.id)}>{artistName(artist)}</option>
                        ))}
                    </select>
                </label>
            ) : (
                <OptionList legend={t(locale, 'filters.artist')} value={filters.artist} options={artists.map((a) => ({ value: String(a.id), label: artistName(a) }))} onChange={(artist) => onChange({ artist })} />
            )}

            <RangeFields legend={t(locale, 'filters.size')} minKey="size_min" maxKey="size_max" filters={filters} onChange={onChange} invalid={invalidRanges.size_min} onErrorChange={onRangeErrorChange} />
            <RangeFields legend={t(locale, 'filters.price')} minKey="price_min" maxKey="price_max" filters={filters} onChange={onChange} invalid={invalidRanges.price_min} onErrorChange={onRangeErrorChange} />

            <OptionList
                legend={t(locale, 'filters.status')}
                value={filters.status === 'available' ? 'available' : 'all'}
                options={[{ value: 'all', label: t(locale, 'filters.all') }, { value: 'available', label: t(locale, 'filters.availableOnly') }]}
                onChange={(value) => onChange({ status: value === 'available' ? 'available' : undefined })}
            />

            <label className="flex flex-col gap-step-2 text-label text-ink-muted">
                {t(locale, 'filters.sort')}
                <select value={filters.sort || ''} onChange={(event) => onChange({ sort: event.target.value || undefined })} className={fieldClass}>
                    <option value="">{t(locale, 'filters.sortDefault')}</option>
                    <option value="newest">{t(locale, 'filters.sortNewest')}</option>
                    <option value="price_asc">{t(locale, 'filters.sortPriceAsc')}</option>
                    <option value="price_desc">{t(locale, 'filters.sortPriceDesc')}</option>
                </select>
            </label>
        </div>
    );
}
