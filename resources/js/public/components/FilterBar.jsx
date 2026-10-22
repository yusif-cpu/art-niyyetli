import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import { toggleLineClass } from '../lib/linkLine.js';

// With more artists than this the artist choice becomes a <select>, otherwise an inline option list.
const ARTIST_LIST_MAX = 12;

// Options and fields are 44px touch targets (min-h-11), the text stays text-meta. Options are plain text, no box.
const optionClass = (selected) =>
    `inline-flex min-h-11 cursor-pointer items-center text-meta transition-colors duration-[120ms] ease-standard ${selected ? 'text-ink' : 'text-ink-muted hover:text-ink'}`;
const fieldClass = 'min-h-11 w-full rounded-input border border-line-strong bg-surface-raised px-step-2 py-step-1 text-meta text-ink';

/** The small wine chevron after a filter's name. */
function Chevron({ open }) {
    return (
        <svg aria-hidden="true" viewBox="0 0 10 6" className={`h-[6px] w-[10px] shrink-0 fill-none stroke-wine stroke-[1.4] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
            <path d="M1 1l4 4 4-4" />
        </svg>
    );
}

/**
 * An inline single-choice list (the API filters on ONE genre / medium / artist, E7). Clicking the selected option
 * clears it. aria-pressed tells the state; the selection shows as ink with a line under it, never a box or a fill.
 */
function OptionList({ legend, options, value, onChange, showLegend = true }) {
    if (options.length === 0) return null;

    return (
        <fieldset className="flex flex-col gap-step-2">
            <legend className={showLegend ? 'mb-step-2 text-label text-ink-muted' : 'sr-only'}>{legend}</legend>
            <div className="flex flex-col items-start">
                {options.map((option) => {
                    const selected = value === option.value;

                    return (
                        <button key={option.value} type="button" aria-pressed={selected} onClick={() => onChange(selected ? undefined : option.value)} className={optionClass(selected)}>
                            <span className={toggleLineClass(selected)}>{option.label}</span>
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
function RangeFields({ legend, minKey, maxKey, filters, onChange, invalid }) {
    const { locale } = useLocale();
    const applied = { min: filters[minKey] ?? '', max: filters[maxKey] ?? '' };
    const [draft, setDraft] = useState(() => (invalid ? { min: invalid.min, max: invalid.max } : applied));
    const [error, setError] = useState(() => Boolean(invalid));

    // The sync effect below also fires once on mount (React runs every effect after the first render, not just on later
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
 * One filter of the strip's right side: its name with a small wine chevron; it opens a panel under it with the
 * control. Only one panel is open at a time (`open` / `onToggle` from the bar); Escape or a click outside closes it.
 * A closed panel stays mounted (hidden), so a half-typed range keeps its draft and its validation message.
 * `active` marks a filter that is set: its name in wine 600.
 */
function Dropdown({ id, label, active, open, onToggle, children, align = 'left' }) {
    return (
        <div className="relative">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={id}
                onClick={onToggle}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-step-2 text-[14px] leading-[1.2] whitespace-nowrap transition-colors duration-150 ${active ? 'font-semibold text-wine' : 'font-medium text-ink hover:text-wine'}`}
            >
                {label}
                <Chevron open={open} />
            </button>
            <div
                id={id}
                className={`${open ? 'block' : 'hidden'} absolute top-full z-10 mt-step-2 w-[17rem] max-w-[calc(100vw-40px)] border border-line bg-surface p-step-5 shadow-[0_18px_40px_-24px_rgba(26,22,20,0.35)] ${align === 'right' ? 'right-0' : 'left-0'}`}
            >
                {children}
            </div>
        </div>
    );
}

/**
 * The catalogue filters as one strip on cream (krem-bordo): the genre chips on the left — "Hamısı" and every genre;
 * the chosen one wine with surface text, the others in a 1px line — and on the right the other filters (artist,
 * medium, size, price, status) and the sort, each its name with a small wine chevron that opens its control. The
 * filter logic is unchanged: `filters` uses the API parameter names (genre, medium, artist, size_min, size_max,
 * price_min, price_max, status, sort); onChange receives a patch. `invalidRanges` pre-fills a range that arrived
 * invalid in the URL, with its message (and opens nothing by itself: the field is in its panel).
 */
export default function FilterBar({ filters, onChange, genres = [], mediums = [], artists = [], invalidRanges = {} }) {
    const { locale } = useLocale();
    const [openKey, setOpenKey] = useState(() => (invalidRanges.price_min ? 'price' : invalidRanges.size_min ? 'size' : null));
    const ref = useRef(null);
    const nameOf = (item) => item.name || item.slug;
    const artistName = (artist) => [artist.first_name, artist.last_name].filter(Boolean).join(' ');
    const toggle = (key) => () => setOpenKey((current) => (current === key ? null : key));

    useEffect(() => {
        if (!openKey) return undefined;
        const onDown = (event) => {
            if (ref.current && !ref.current.contains(event.target)) setOpenKey(null);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') setOpenKey(null);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [openKey]);

    const chip = (selected) =>
        `inline-flex min-h-11 cursor-pointer items-center border px-[22px] text-[14px] leading-[1.2] font-medium whitespace-nowrap transition-colors duration-150 ${selected ? 'border-wine bg-wine text-surface' : 'border-line text-ink hover:border-wine'}`;
    const dd = (key, label, active, control, align) => (
        <Dropdown id={`filter-${key}`} label={label} active={active} open={openKey === key} onToggle={toggle(key)} align={align}>
            {control}
        </Dropdown>
    );
    const sortLabels = { '': t(locale, 'filters.sortDefault'), newest: t(locale, 'filters.sortNewest'), price_asc: t(locale, 'filters.sortPriceAsc'), price_desc: t(locale, 'filters.sortPriceDesc') };

    return (
        <div ref={ref} className="flex flex-col gap-step-4 lg:flex-row lg:items-center lg:justify-between lg:gap-step-6" data-testid="filter-bar">
            {genres.length > 0 && (
                <fieldset className="min-w-0">
                    <legend className="sr-only">{t(locale, 'filters.genre')}</legend>
                    <div className="-mx-page flex gap-step-2 overflow-x-auto px-page lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" data-testid="genre-chips">
                        <button type="button" aria-pressed={!filters.genre} onClick={() => onChange({ genre: undefined })} className={chip(!filters.genre)}>
                            {t(locale, 'filters.all')}
                        </button>
                        {genres.map((g) => {
                            const selected = filters.genre === g.slug;

                            return (
                                <button key={g.slug} type="button" aria-pressed={selected} onClick={() => onChange({ genre: selected ? undefined : g.slug })} className={chip(selected)}>
                                    {nameOf(g)}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            )}

            <div className="flex flex-wrap items-center gap-x-step-5 gap-y-step-1">
                {dd(
                    'artist',
                    t(locale, 'filters.artist'),
                    Boolean(filters.artist),
                    artists.length > ARTIST_LIST_MAX ? (
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
                        <OptionList legend={t(locale, 'filters.artist')} showLegend={false} value={filters.artist} options={artists.map((a) => ({ value: String(a.id), label: artistName(a) }))} onChange={(artist) => onChange({ artist })} />
                    ),
                )}
                {mediums.length > 0 && dd('medium', t(locale, 'filters.medium'), Boolean(filters.medium), (
                    <OptionList legend={t(locale, 'filters.medium')} showLegend={false} value={filters.medium} options={mediums.map((m) => ({ value: m.slug, label: nameOf(m) }))} onChange={(medium) => onChange({ medium })} />
                ))}
                {dd('size', t(locale, 'pages.catalogue.metaSize'), Boolean(filters.size_min || filters.size_max), (
                    <RangeFields legend={t(locale, 'filters.size')} minKey="size_min" maxKey="size_max" filters={filters} onChange={onChange} invalid={invalidRanges.size_min} />
                ))}
                {dd('price', t(locale, 'pages.catalogue.metaPrice'), Boolean(filters.price_min || filters.price_max), (
                    <RangeFields legend={t(locale, 'filters.price')} minKey="price_min" maxKey="price_max" filters={filters} onChange={onChange} invalid={invalidRanges.price_min} />
                ), 'right')}
                {dd('status', t(locale, 'filters.status'), filters.status === 'available', (
                    <OptionList
                        legend={t(locale, 'filters.status')}
                        showLegend={false}
                        value={filters.status === 'available' ? 'available' : 'all'}
                        options={[{ value: 'all', label: t(locale, 'filters.all') }, { value: 'available', label: t(locale, 'filters.availableOnly') }]}
                        onChange={(value) => onChange({ status: value === 'available' ? 'available' : undefined })}
                    />
                ), 'right')}

                {/* The sort: a native select drawn as "Sırala: <choice>" with the chevron, so the keyboard and the
                    phone's own picker keep working. */}
                <label className="relative inline-flex min-h-11 cursor-pointer items-center gap-step-2 text-[14px] leading-[1.2] font-medium whitespace-nowrap text-ink">
                    <span aria-hidden="true">
                        {t(locale, 'pages.catalogue.sortBy')}: {(sortLabels[filters.sort || ''] ?? '').toLocaleLowerCase(locale)}
                    </span>
                    <Chevron open={false} />
                    <select
                        aria-label={t(locale, 'filters.sort')}
                        value={filters.sort || ''}
                        onChange={(event) => onChange({ sort: event.target.value || undefined })}
                        className="absolute inset-0 min-h-11 cursor-pointer opacity-0"
                    >
                        <option value="">{sortLabels['']}</option>
                        <option value="newest">{sortLabels.newest}</option>
                        <option value="price_asc">{sortLabels.price_asc}</option>
                        <option value="price_desc">{sortLabels.price_desc}</option>
                    </select>
                </label>
            </div>
        </div>
    );
}
