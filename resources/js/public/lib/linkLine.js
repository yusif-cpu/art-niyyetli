/**
 * The line under a chosen text toggle (a filter option, a wall height, the current page): `link-line` from
 * public.css. The others keep a transparent line, so choosing one moves nothing.
 */
export function toggleLineClass(chosen) {
    return chosen ? 'link-line' : 'link-line border-transparent';
}
