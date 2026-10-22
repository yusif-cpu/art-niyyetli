import { Fragment } from 'react';

// `*word*`: text between two asterisks on one line, no asterisk inside, no space just inside either mark (so the
// asterisks of "5 * 3" are not a mark).
const MARK = /\*(?!\s)([^*\n]*?[^\s*])\*/g;

/** The text without its emphasis marks, for places that take plain text (the page title, an aria-label). */
export function plainText(text) {
    return String(text ?? '').replace(MARK, '$1');
}

/**
 * A title with one word emphasised: `Sənəti *həqiqi* ölçüsündə görün.` renders "həqiqi" as an <em> in Spectral italic
 * (the `emphasis` utility in public.css: the title's colour on cream, #F0D9CF on wine). Built from React elements,
 * never from HTML: the text is admin or dictionary data, so a "<b>" in it stays literal text. A lone asterisk is
 * kept as it is.
 */
export default function Emphasis({ text }) {
    const source = String(text ?? '');
    const parts = [];
    let last = 0;
    for (const match of source.matchAll(MARK)) {
        if (match.index > last) parts.push(source.slice(last, match.index));
        parts.push(<em key={match.index} className="emphasis">{match[1]}</em>);
        last = match.index + match[0].length;
    }
    if (last < source.length) parts.push(source.slice(last));

    return <Fragment>{parts}</Fragment>;
}
