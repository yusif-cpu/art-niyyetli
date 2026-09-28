// Display formatting shared by every screen, so a price or a size never looks different from one card to the next.

const NBSP = ' ';

function groupThousands(value) {
    const [whole, fraction] = String(value).split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

    return fraction ? `${grouped},${fraction}` : grouped;
}

/** 6400 → "6 400 AZN" (non-breaking spaces, so the figure never wraps). Whole numbers show no ".00". */
export function formatPrice(price, currency) {
    if (typeof price !== 'number' || !Number.isFinite(price)) return null;
    const rounded = Math.round(price * 100) / 100;
    const text = groupThousands(Number.isInteger(rounded) ? rounded : rounded.toFixed(2));

    return currency ? `${text}${NBSP}${currency}` : text;
}

function formatCm(value, locale) {
    const text = String(Math.round(value * 10) / 10); // 120 → "120", 120.5 → "120.5", never "120.00"

    return locale === 'en' ? text : text.replace('.', ',');
}

// Month names are spelled out here rather than taken from Intl: browsers without Azerbaijani locale data (headless
// Edge was one) fall back to "2027 M04 1".
const MONTHS = {
    az: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** "2026-04-01" → "1 aprel 2026" (az) / "1 April 2026" (en). The calendar date as written (a datetime keeps its own day). */
export function formatDate(value, locale = 'az') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
    if (!match) return null;
    const [, year, month, day] = match;
    const name = (MONTHS[locale] ?? MONTHS.az)[Number(month) - 1];

    return name ? `${Number(day)} ${name} ${year}` : null;
}

/** "2027-04-10" → "aprel 2027" (az) / "April 2027" (en). */
export function formatMonthYear(value, locale = 'az') {
    const match = /^(\d{4})-(\d{2})/.exec(String(value ?? ''));
    if (!match) return null;
    const name = (MONTHS[locale] ?? MONTHS.az)[Number(match[2]) - 1];

    return name ? `${name} ${match[1]}` : null;
}

/** "1 aprel 2026 – 30 aprel 2026", or one date when both ends are the same. */
export function formatDateRange(start, end, locale = 'az') {
    const a = formatDate(start, locale);
    const b = formatDate(end, locale);

    return a && b && a !== b ? `${a} – ${b}` : a || b;
}

/** Width first: "180 × 140 sm" (az) / "180 × 140 cm" (en). The sign is U+00D7, never the letter x. */
export function formatDimensions(widthCm, heightCm, locale = 'az') {
    if (!(widthCm > 0) || !(heightCm > 0)) return null;

    return `${formatCm(widthCm, locale)}${NBSP}×${NBSP}${formatCm(heightCm, locale)}${NBSP}${locale === 'en' ? 'cm' : 'sm'}`;
}
