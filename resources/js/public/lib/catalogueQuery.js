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

/** Clean state from a query string: only known keys with valid values. Page 1 is implicit. */
export function parseQuery(search) {
    const params = new URLSearchParams(search);
    const state = {};
    for (const key of QUERY_KEYS) {
        const value = RULES[key](params.get(key) ?? undefined);
        if (value !== undefined) state[key] = value;
    }
    // A max below the given min would be a 422: drop the max.
    for (const [min, max] of [['size_min', 'size_max'], ['price_min', 'price_max']]) {
        if (state[min] !== undefined && state[max] !== undefined && Number(state[max]) < Number(state[min])) delete state[max];
    }

    return state;
}

/** "?genre=abstraksiya&page=2", or "" when there is nothing to keep. Keys in a stable order. */
export function toSearch(state) {
    const params = new URLSearchParams();
    for (const key of QUERY_KEYS) {
        const value = RULES[key](state[key] === undefined || state[key] === null ? undefined : String(state[key]));
        if (value !== undefined) params.set(key, value);
    }
    const text = params.toString();

    return text ? `?${text}` : '';
}

/** How many filters are active (sort and page are not filters). */
export function activeFilterCount(state) {
    return FILTERS.filter((key) => state[key] !== undefined).length;
}
