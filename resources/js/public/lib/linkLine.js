/**
 * The line under a chosen text toggle (a filter option, a wall height, the current page): `link-line` from
 * public.css. The others get a transparent 1px border and the same 3px padding instead, so choosing one moves
 * nothing. They must not carry `link-line` at all: its `border-bottom` shorthand sets the colour to currentColor
 * and, coming later in the CSS, beats `border-transparent` — every option would show the line.
 */
export function toggleLineClass(chosen) {
    return chosen ? 'link-line' : 'border-b border-transparent pb-[3px]';
}
