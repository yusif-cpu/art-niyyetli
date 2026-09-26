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

/** Width first: "180 × 140 sm" (az) / "180 × 140 cm" (en). The sign is U+00D7, never the letter x. */
export function formatDimensions(widthCm, heightCm, locale = 'az') {
    if (!(widthCm > 0) || !(heightCm > 0)) return null;

    return `${formatCm(widthCm, locale)}${NBSP}×${NBSP}${formatCm(heightCm, locale)}${NBSP}${locale === 'en' ? 'cm' : 'sm'}`;
}
