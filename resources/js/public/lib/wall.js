/**
 * The wall — ArtNiyyətli's one sizing rule, shared by every screen that shows artworks at true relative size
 * (catalogue grid, similar works, artist works, the home wall, "divarda gör" on the artwork page).
 *
 * Pure functions only: numbers in, numbers out. No React, no DOM, no browser API. The container width reaches this
 * module through useElementWidth (a ResizeObserver) — never through a timer.
 *
 * ── The formula ───────────────────────────────────────────────────────────────────────────────────────────────────
 *     width_px  = width_cm  × k
 *     height_px = height_cm × k
 *     figure    = 170 cm    × k        (the human silhouette uses the SAME k — its only job is to show the ratio)
 *     wall      = wall_cm   × k        ("divarda gör": 240 / 270 / 320 cm)
 * One k per view: every work in a row, a grid or on a wall is measured with the same k, otherwise relative size
 * means nothing. k is never computed per card.
 *
 * ── How k is chosen (computeScale) ────────────────────────────────────────────────────────────────────────────────
 *   mode 'row'     all works side by side must fit:     k_fit = (width − gap × (n − 1)) / Σ width_cm
 *   mode 'grid'    wrapping grid (catalogue, similar, artist works): the widest work takes `share` of the width:
 *                                                        k_fit = width × share / max width_cm      (demo: cells())
 *   mode 'column'  one work per line (the vertical wall on phones): k_fit = width × share / max width_cm
 *   mode 'scroll'  no width limit (the horizontal home wall scrolls): k = targetK (derived from the height)
 * then the limits, in this order of priority:
 *   1. maxItemHeightPx — the tallest work may not be taller than this (it must not fill the screen): k ≤ max / max h
 *   2. the width fit above (nothing overflows a row/grid/column)
 *   3. minItemPx — the smallest work should be at least this wide (legibility). It can only RAISE k in 'scroll'
 *      mode; in the fitting modes it never breaks 1 or 2, it is reported as `minSatisfied: false` instead, and the
 *      screen keeps a readable card around the true-size field (the demo's 155px card, field stays true).
 *   4. maxK caps k everywhere (px per cm); minK is a floor that, like minItemPx, only acts in 'scroll' mode and
 *      never beats a cap — e.g. the demo's 0.4 px/cm floor on the home wall.
 * All limits are parameters; nothing is hard-coded for a screen. PRESETS below records the demo's values.
 *
 * ── Invalid dimensions (both width_cm and height_cm are checked) ─────────────────────────────────────────────────
 *   0, negative, null/undefined, not a number (strings are NOT coerced — the API always sends numbers, so a string
 *   means bad data), NaN/Infinity, larger than maxCm (default 2000 cm — a 5000 cm "work" is a typo, and one such
 *   value would shrink every other work to a dot):
 *   → the work is left OUT of the scale and out of the wall/row geometry, and returned in `skipped` with a reason.
 *     Grids get `valid: false` entries so the screen can still show an unscaled fallback card (no size claim).
 *   Empty list, or no valid work → k = 0, ready: false (nothing to place).
 *   Container width/height 0 (first render, before ResizeObserver reports) → k = 0, ready: false.
 *
 * ── Rounding ──────────────────────────────────────────────────────────────────────────────────────────────────────
 *   k and all cm maths stay unrounded. Pixels are rounded at the EDGES, not the sizes:
 *       left = round(x),  width = round(x + w) − left
 *   so ten cards plus their gaps always end exactly at round(total) — rounding error never accumulates, and no
 *   card is off by more than 1px from its exact size. Heights (which do not accumulate) are simply rounded.
 */

export const HUMAN_HEIGHT_CM = 170;
/** Silhouette geometry from the demo (figureStyles), in cm: 46 wide; body 32 × 148 at 7; head Ø18 at 14, bottom 150. */
export const FIGURE_CM = { width: 46, bodyLeft: 7, bodyWidth: 32, bodyHeight: 148, headLeft: 14, headSize: 18, headBottom: 150 };
export const MAX_DIMENSION_CM = 2000;
/** Same breakpoint as the header's `md` (Tailwind's 768px): below it the wall turns vertical. */
export const VERTICAL_BELOW_PX = 768;
/** "Divarda gör" wall heights (cm) and the museum hang line (centre of the work above the floor). */
export const WALL_HEIGHTS_CM = [240, 270, 320];
export const HANG_CENTRE_CM = 150;

/**
 * The demo's numbers, for the screens of stages 4–6. `share` = fraction of the container the widest work takes.
 * maxItemHeightRatio is applied by the caller to the viewport height (maxItemHeightPx = innerHeight × ratio).
 */
export const PRESETS = {
    catalogue: { mode: 'grid', share: 0.44, shareVertical: 0.86, maxItemHeightRatio: 0.7, minItemPx: 48 },
    similar: { mode: 'grid', share: 0.3, shareVertical: 0.8, maxItemHeightRatio: 0.7, minItemPx: 48 },
    artistWorks: { mode: 'grid', share: 0.4, shareVertical: 0.86, maxItemHeightRatio: 0.7, minItemPx: 48 },
    // The artwork page's main field: fill the width / 70% of the viewport height, but never above 6 px/cm — so a small
    // work is not shown as large as a big one (at 1440: 180 cm → 810px, 40 cm → 240px). One cap for every width.
    detailMain: { mode: 'grid', share: 1, maxItemHeightRatio: 0.7, maxK: 6 },
    homeWall: { wallCm: 270, centreCm: HANG_CENTRE_CM, topCm: 30, minK: 0.4, gapCm: 43, minGapPx: 210, captionPx: 64 },
    detailWall: { wallCm: 270, centreCm: HANG_CENTRE_CM, sideCm: 30, gapCm: 60, maxK: 1.6 },
};

/**
 * The one physical wall model (home wall, artist wall, "divarda gör"): a wall of `wallCm` from the floor up, works
 * hung with their centre at `centreCm` (never below the floor), and at least `topCm` of wall above the highest work —
 * a work taller than the wall raises the wall instead of being clipped.
 */
export function effectiveWallCm(entries, { wallCm, centreCm = HANG_CENTRE_CM, topCm = 30 }) {
    const highest = entries.reduce((max, e) => Math.max(max, Math.max(0, centreCm - e.h / 2) + e.h), 0);

    return Math.max(wallCm, highest + topCm);
}

// ─── validation ────────────────────────────────────────────────────────────────────────────────────────────────────

function isValidCm(value, maxCm) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= maxCm;
}

/** Reads an artwork's size. Accepts the API shape ({ width_cm, height_cm }) or { w, h }. */
export function readDims(item) {
    if (!item || typeof item !== 'object') return { w: undefined, h: undefined };

    return { w: item.width_cm ?? item.w, h: item.height_cm ?? item.h };
}

export function isValidDims(w, h, maxCm = MAX_DIMENSION_CM) {
    return isValidCm(w, maxCm) && isValidCm(h, maxCm);
}

function reasonFor(w, h, maxCm) {
    for (const v of [w, h]) {
        if (v === null || v === undefined) return 'missing';
        if (typeof v !== 'number' || !Number.isFinite(v)) return 'not-a-number';
        if (v <= 0) return 'not-positive';
        if (v > maxCm) return 'too-large';
    }

    return null;
}

/** Splits a list into works with usable dimensions and skipped ones (with the reason). Keeps the input order. */
export function partition(items, { maxCm = MAX_DIMENSION_CM } = {}) {
    const valid = [];
    const skipped = [];
    (Array.isArray(items) ? items : []).forEach((item, index) => {
        const { w, h } = readDims(item);
        const reason = reasonFor(w, h, maxCm);
        if (reason) skipped.push({ item, index, reason });
        else valid.push({ item, index, w, h });
    });

    return { valid, skipped };
}

// ─── the scale ─────────────────────────────────────────────────────────────────────────────────────────────────────

const positive = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * Chooses the one k for a set of works. See the header for the rules.
 * @returns {{ k: number, ready: boolean, limitedBy: string|null, minSatisfied: boolean, valid: Array, skipped: Array }}
 */
export function computeScale(items, {
    mode = 'row',
    width = 0,
    gap = 0,
    share = 1,
    targetK,
    minItemPx = 0,
    maxItemHeightPx = Infinity,
    minK = 0,
    maxK = Infinity,
    maxCm = MAX_DIMENSION_CM,
} = {}) {
    const { valid, skipped } = partition(items, { maxCm });
    const none = { k: 0, ready: false, limitedBy: null, minSatisfied: false, valid, skipped };
    if (valid.length === 0) return none;

    const maxW = Math.max(...valid.map((e) => e.w));
    const minW = Math.min(...valid.map((e) => e.w));
    const maxH = Math.max(...valid.map((e) => e.h));

    const candidates = [];
    if (mode === 'scroll') {
        if (!positive(targetK)) return none;
        candidates.push(['target', targetK]);
    } else {
        if (!positive(width)) return none;
        const room = mode === 'row' ? width - gap * (valid.length - 1) : width * share;
        const denom = mode === 'row' ? valid.reduce((sum, e) => sum + e.w, 0) : maxW;
        if (room <= 0) return none;
        candidates.push(['width', room / denom]);
    }
    if (positive(maxItemHeightPx) && Number.isFinite(maxItemHeightPx)) candidates.push(['height', maxItemHeightPx / maxH]);
    if (Number.isFinite(maxK) && maxK > 0) candidates.push(['maxK', maxK]);

    let [limitedBy, k] = candidates.reduce((best, c) => (c[1] < best[1] ? c : best));

    // Floors (minItemPx, minK) may only RAISE k on the scrolling wall — the only place where nothing has to fit — and
    // never above a cap (height, maxK). In the fitting modes k is already the smallest cap, so they cannot move it.
    if (mode === 'scroll') {
        const caps = candidates.filter(([name]) => name !== 'target').map(([, v]) => v);
        const cap = caps.length ? Math.min(...caps) : Infinity;
        const floors = [['min', minItemPx > 0 ? minItemPx / minW : 0], ['minK', minK]];
        for (const [name, floor] of floors) {
            const raised = Math.min(floor, cap);
            if (raised > k) [limitedBy, k] = [name, raised];
        }
    }

    return { k, ready: k > 0, limitedBy, minSatisfied: minW * k >= minItemPx - 1e-9, valid, skipped };
}

// ─── pixels ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Edge rounding: a span [x, x + size) becomes integer start + integer length whose end is round(x + size). */
export function roundSpan(x, size) {
    const start = Math.round(x);

    return { start, length: Math.round(x + size) - start };
}

/** Pixel sizes of works at k (grids: each card is independent, so sizes are rounded individually). */
export function sizeItems(entries, k) {
    return entries.map((e) => ({ item: e.item, index: e.index, widthCm: e.w, heightCm: e.h, width: Math.round(e.w * k), height: Math.round(e.h * k) }));
}

/**
 * Side-by-side row at k with a fixed px gap, bottom-aligned (like the demo's zone). Positions use edge rounding.
 * @returns {{ items: Array, width: number, height: number }}
 */
export function layoutRow(entries, k, { gap = 0, start = 0 } = {}) {
    let x = start;
    const items = entries.map((e) => {
        const span = roundSpan(x, e.w * k);
        x += e.w * k + gap;

        return { item: e.item, index: e.index, widthCm: e.w, heightCm: e.h, left: span.start, width: span.length, height: Math.round(e.h * k) };
    });
    const end = entries.length ? x - gap : start;

    return { items, width: Math.round(end) - Math.round(start), height: items.reduce((m, i) => Math.max(m, i.height), 0) };
}

/** A catalogue card never gets narrower than this, so its text block stays readable; the FIELD keeps its true size. */
export const MIN_CARD_PX = 155;

/**
 * One card at k: the field is the work at true size, the card is at least MIN_CARD_PX wide, and the field is centred
 * in it (the empty space either side is plain surface, so the field's own edge still shows the real width).
 */
export function cardSize(w, h, k, { minCardPx = MIN_CARD_PX } = {}) {
    const fieldWidth = Math.round(w * k);
    const fieldHeight = Math.round(h * k);
    const cardWidth = Math.max(minCardPx, fieldWidth);

    return { fieldWidth, fieldHeight, cardWidth, fieldLeft: Math.round((cardWidth - fieldWidth) / 2) };
}

/**
 * The catalogue grid: cards at ONE k for the whole list, packed left to right into rows.
 *  - a card that does not fit starts a new row; a lone card that is wider than the container keeps its size
 *  - each row's zone height = the tallest field IN THAT ROW (no shared zone for the whole list, so a row of small
 *    works gets no empty band above it)
 *  - fields are bottom-aligned in their row, so every text block of a row starts on one line (the catalogue reads
 *    as a list; the wall keeps its 150 cm centre line — the difference is deliberate)
 *  - the last row stays left-aligned, never stretched; the gap is a fixed px token, not centimetres
 *  - invalid sizes go to `skipped` (see partition) and do not disturb the packing
 * Card positions use edge rounding, like layoutRow.
 * @returns {{ rows: Array<{ items: Array, zoneHeight: number, width: number }>, skipped: Array }}
 */
export function packRows(items, { containerWidth = 0, k = 0, gap = 0, minCardPx = MIN_CARD_PX, maxCm = MAX_DIMENSION_CM } = {}) {
    const { valid, skipped } = partition(items, { maxCm });
    if (!positive(containerWidth) || !positive(k)) return { rows: [], skipped };

    const rows = [];
    let current = null;
    for (const e of valid) {
        const size = cardSize(e.w, e.h, k, { minCardPx });
        const exactCard = Math.max(minCardPx, e.w * k);
        if (!current || (current.items.length > 0 && current.x + exactCard > containerWidth + 0.5)) {
            current = { items: [], x: 0 };
            rows.push(current);
        }
        const span = roundSpan(current.x, exactCard);
        current.items.push({ item: e.item, index: e.index, widthCm: e.w, heightCm: e.h, left: span.start, ...size, cardWidth: span.length });
        current.x += exactCard + gap;
    }

    return {
        rows: rows.map((row) => {
            const zoneHeight = Math.max(...row.items.map((i) => i.fieldHeight));
            const last = row.items[row.items.length - 1];

            return {
                zoneHeight,
                width: last.left + last.cardWidth,
                items: row.items.map((i) => {
                    // edge rounding can make a field-wide card 1px narrower than the rounded field: never overflow the card
                    const fieldWidth = Math.min(i.fieldWidth, i.cardWidth);

                    return { ...i, fieldWidth, fieldLeft: Math.round((i.cardWidth - fieldWidth) / 2), fieldTop: zoneHeight - i.fieldHeight };
                }),
            };
        }),
        skipped,
    };
}

/** The 170 cm silhouette at k — always the same k as the works next to it. */
export function figureAt(k) {
    const f = FIGURE_CM;

    return {
        width: Math.round(f.width * k),
        height: Math.round(HUMAN_HEIGHT_CM * k),
        body: { left: Math.round(f.bodyLeft * k), width: Math.round(f.bodyWidth * k), height: Math.round(f.bodyHeight * k) },
        head: { left: Math.round(f.headLeft * k), size: Math.round(f.headSize * k), bottom: Math.round(f.headBottom * k) },
    };
}

// ─── the home wall ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The home wall. Horizontal (≥ VERTICAL_BELOW_PX): a scrolling strip on the same physical model as "divarda gör" —
 *     k = (available height − caption band) / wall_cm        (wall_cm = 270 by default; 240 / 270 / 320)
 * The floor is the bottom edge of the wall; captions sit in a band below it. Works hang with their centre at
 * `centreCm` (150) above the floor, the 170 cm figure stands on the floor at the left, a work taller than the wall
 * raises the wall (effectiveWallCm), k never drops below minK (0.4). Gaps are `gapCm` but never below `minGapPx`
 * so captions (≈190px wide) never collide.
 * Vertical (< VERTICAL_BELOW_PX): works stack top to bottom in one column right of the figure; k comes from the
 * WIDTH so the widest work fits next to the figure column.
 * The demo's hand-hung jitter/pairing offsets and its "cut" rule are cosmetic and deliberately not reproduced here.
 */
export function wallLayout(items, {
    width = 0,
    height = 0,
    vertical = width > 0 && width < VERTICAL_BELOW_PX,
    wallCm = PRESETS.homeWall.wallCm,
    centreCm = PRESETS.homeWall.centreCm,
    topCm = PRESETS.homeWall.topCm,
    gapCm = PRESETS.homeWall.gapCm,
    minGapPx = PRESETS.homeWall.minGapPx,
    captionPx = PRESETS.homeWall.captionPx,
    gutterCm = 18,
    minItemPx = 0,
    maxItemHeightPx = Infinity,
    minK = PRESETS.homeWall.minK,
    maxK = Infinity,
    maxCm = MAX_DIMENSION_CM,
} = {}) {
    const figCm = FIGURE_CM.width;

    if (vertical) {
        const { valid, skipped } = partition(items, { maxCm });
        if (valid.length === 0 || !positive(width)) return { k: 0, ready: false, vertical, items: [], skipped, figure: null, width: 0, height: 0 };
        // The figure column + a gutter + the widest work must fit the width; the tallest work obeys the height cap.
        const leftCm = figCm + gutterCm;
        const maxW = Math.max(...valid.map((e) => e.w));
        const maxH = Math.max(...valid.map((e) => e.h));
        const k = Math.min(width / (leftCm + maxW), Number.isFinite(maxItemHeightPx) && maxItemHeightPx > 0 ? maxItemHeightPx / maxH : Infinity, Number.isFinite(maxK) && maxK > 0 ? maxK : Infinity);
        let y = 0;
        const placed = valid.map((e) => {
            const top = roundSpan(y, e.h * k);
            const left = roundSpan(leftCm * k, e.w * k);
            y += e.h * k + captionPx + gapCm * k;

            return { item: e.item, index: e.index, widthCm: e.w, heightCm: e.h, left: left.start, top: top.start, width: left.length, height: top.length };
        });
        const figure = { ...figureAt(k), left: 0, top: 0 };

        return { k, ready: k > 0, vertical, items: placed, skipped, figure, width: Math.round(width), height: Math.round(Math.max(y - gapCm * k, figure.height)) };
    }

    const { valid, skipped } = partition(items, { maxCm });
    const wallHeightCm = effectiveWallCm(valid, { wallCm, centreCm, topCm });
    const targetK = positive(height) ? (height - captionPx) / wallHeightCm : 0;
    const scale = computeScale(items, { mode: 'scroll', targetK, minItemPx, maxItemHeightPx, minK, maxK, maxCm });
    if (!scale.ready) return { k: 0, ready: false, vertical, items: [], skipped, figure: null, width: 0, height: 0 };

    const k = scale.k;
    const floorPx = wallHeightCm * k;
    let x = (figCm + figCm) * k; // figure column + the same again as air before the first work (demo: startPad)
    const gapPx = Math.max(gapCm * k, minGapPx);
    const placed = scale.valid.map((e) => {
        const bottomCm = Math.max(0, centreCm - e.h / 2);
        const span = roundSpan(x, e.w * k);
        x += e.w * k + gapPx;

        return { item: e.item, index: e.index, widthCm: e.w, heightCm: e.h, left: span.start, width: span.length, top: Math.round(floorPx - (bottomCm + e.h) * k), height: Math.round(e.h * k) };
    });
    const fig = figureAt(k);

    return {
        k,
        ready: true,
        vertical,
        items: placed,
        skipped: scale.skipped,
        figure: { ...fig, left: 0, top: Math.round(floorPx) - fig.height },
        floor: Math.round(floorPx),
        wallCm: wallHeightCm,
        width: Math.round(x - gapPx),
        height: Math.round(floorPx + captionPx),
    };
}

// ─── "divarda gör" ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * One work on a wall of `wallCm` (240 / 270 / 320) next to the 170 cm figure. k comes from the wall's own container
 * (independent of the catalogue's k): the wall must fit `height` and the scene (side air + work + gap + figure + side
 * air) must fit `width`. The work hangs with its centre at `centreCm`; it never goes below the floor, and a work
 * taller than the wall raises the wall (wall = max(wallCm, top of the work + side air)) instead of being clipped.
 * @returns {{ k, ready, wall: {width, height, heightCm}, work: {left, bottom, width, height}, figure: {left, bottom, width, height, …} }}
 */
export function detailWallLayout(item, {
    width = 0,
    height = 0,
    wallCm = PRESETS.detailWall.wallCm,
    centreCm = PRESETS.detailWall.centreCm,
    sideCm = PRESETS.detailWall.sideCm,
    gapCm = PRESETS.detailWall.gapCm,
    maxK = PRESETS.detailWall.maxK,
    maxCm = MAX_DIMENSION_CM,
} = {}) {
    const { w, h } = readDims(item);
    if (!isValidDims(w, h, maxCm) || !positive(width) || !positive(height) || !positive(wallCm)) {
        return { k: 0, ready: false, reason: isValidDims(w, h, maxCm) ? 'no-room' : reasonFor(w, h, maxCm), wall: null, work: null, figure: null };
    }

    const bottomCm = Math.max(0, centreCm - h / 2);
    const wallHeightCm = effectiveWallCm([{ w, h }], { wallCm, centreCm, topCm: sideCm });
    const sceneCm = sideCm + w + gapCm + FIGURE_CM.width + sideCm;
    const k = Math.min(width / sceneCm, height / wallHeightCm, Number.isFinite(maxK) && maxK > 0 ? maxK : Infinity);
    const workLeft = roundSpan(sideCm * k, w * k);
    const figLeft = Math.round((sideCm + w + gapCm) * k);

    return {
        k,
        ready: true,
        wall: { width: Math.round(width), height: Math.round(wallHeightCm * k), heightCm: wallHeightCm },
        work: { left: workLeft.start, bottom: Math.round(bottomCm * k), width: workLeft.length, height: Math.round(h * k) },
        figure: { ...figureAt(k), left: figLeft, bottom: 0 },
    };
}
