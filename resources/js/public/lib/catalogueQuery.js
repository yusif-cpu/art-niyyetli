// The catalogue's state lives in the URL query (shareable, survives reloads, works with Back). Names are the API's
// own parameter names (E7), so the query string can be forwarded as is. Anything invalid is dropped here, so a
// hand-edited URL can never produce a 422.

const FILTERS = ['genre', 'medium', 'artist', 'status', 'size_min', 'size_max', 'price_min', 'price_max'];
export const QUERY_KEYS = [...FILTERS, 'sort', 'page'];

const SORTS = ['newest', 'price_asc', 'price_desc'];
const STATUSES = ['available', 'reserved', 'sold'];

const nonNegative = (v) => (v !== '' && v != null && Number.isFinite(Number(v)) && Number(v) >= 0 ? String(Number(v)) : undefined);
const positiveInt = (v) => (/^\d+$/.test(String(v ?? '')) && Number(v) >= 1 ? String(Number(v)) : undefined);
const slug = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 100 ? v : undefined);

const RULES = {
    genre: slug,
    medium: slug,
    artist: positiveInt,
    status: (v) => (STATUSES.includes(v) ? v : undefined),
    size_min: nonNegative,
    size_max: nonNegative,
    price_min: nonNegative,
    price_max: nonNegative,
    sort: (v) => (SORTS.includes(v) ? v : undefined),
    page: (v) => (positiveInt(v) && v !== '1' ? positiveInt(v) : undefined),
};

const RANGE_PAIRS = [['size_min', 'size_max'], ['price_min', 'price_max']];

// A max below its min would be a 422: drop the max. Shared by parseQuery and toSearch so the app can never write
// an inconsistent range to the URL itself (a hand-edited URL may still arrive with one; that is parseQuery's job).
function dropInvalidRanges(state) {
    for (const [min, max] of RANGE_PAIRS) {
        if (state[min] !== undefined && state[max] !== undefined && Number(state[max]) < Number(state[min])) delete state[max];
    }

    return state;
}

/**
 * Range pairs from a raw query string whose max is below its min, keyed by minKey, with their raw (but
 * individually-valid) values. parseQuery drops the max from its returned state so the request that follows can
 * never be invalid, but that alone leaves a visitor who opened such a link with no explanation for why their max
 * seemingly vanished. The catalogue page uses this to show the same validation message and pre-filled values a
 * visitor gets when they type an invalid range by hand, instead of silently acting as if only the min was given.
 */
export function invalidRangePairs(search) {
    const params = new URLSearchParams(search);
    const found = {};
    for (const [minKey, maxKey] of RANGE_PAIRS) {
        const min = RULES[minKey](params.get(minKey) ?? undefined);
        const max = RULES[maxKey](params.get(maxKey) ?? undefined);
        if (min !== undefined && max !== undefined && Number(max) < Number(min)) found[minKey] = { min, max };
    }

    return found;
}

/** Clean state from a query string: only known keys with valid values. Page 1 is implicit. */
export function parseQuery(search) {
    const params = new URLSearchParams(search);
    const state = {};
    for (const key of QUERY_KEYS) {
        const value = RULES[key](params.get(key) ?? undefined);
        if (value !== undefined) state[key] = value;
    }

    return dropInvalidRanges(state);
}

/** "?genre=abstraksiya&page=2", or "" when there is nothing to keep. Keys in a stable order. */
export function toSearch(state) {
    const clean = dropInvalidRanges({ ...state });
    const params = new URLSearchParams();
    for (const key of QUERY_KEYS) {
        const value = RULES[key](clean[key] === undefined || clean[key] === null ? undefined : String(clean[key]));
        if (value !== undefined) params.set(key, value);
    }
    const text = params.toString();

    return text ? `?${text}` : '';
}

/** How many filters are active (sort and page are not filters). */
export function activeFilterCount(state) {
    return FILTERS.filter((key) => state[key] !== undefined).length;
}
