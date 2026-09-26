import { describe, it, expect } from 'vitest';
import {
    HUMAN_HEIGHT_CM, MAX_DIMENSION_CM, PRESETS, VERTICAL_BELOW_PX, WALL_HEIGHTS_CM,
    computeScale, detailWallLayout, figureAt, isValidDims, layoutRow, packRows, partition, roundSpan, sizeItems, wallLayout,
} from '../lib/wall.js';

// The eight works in the local demo database (API shape).
const LOCAL = [
    { inventory_code: 'AN-2024-031', width_cm: 180, height_cm: 140 },
    { inventory_code: 'AN-2023-018', width_cm: 150, height_cm: 110 },
    { inventory_code: 'AN-2025-014', width_cm: 120, height_cm: 90 },
    { inventory_code: 'AN-2022-047', width_cm: 100, height_cm: 80 },
    { inventory_code: 'AN-2026-005', width_cm: 90, height_cm: 60 },
    { inventory_code: 'AN-2023-009', width_cm: 70, height_cm: 50 },
    { inventory_code: 'AN-2021-022', width_cm: 60, height_cm: 45 },
    { inventory_code: 'AN-2019-003', width_cm: 40, height_cm: 30 },
];
const work = (w, h, code = `${w}x${h}`) => ({ inventory_code: code, width_cm: w, height_cm: h });

describe('wall: one shared k', () => {
    it('gives every work the same k, so px ratios equal cm ratios (row and grid)', () => {
        for (const mode of ['row', 'grid']) {
            const { k, valid } = computeScale(LOCAL, { mode, width: 1296, gap: 24, share: 0.44 });
            const exact = valid.map((e) => e.w * k);
            valid.forEach((e, i) => {
                expect(exact[i] / exact[0]).toBeCloseTo(e.w / valid[0].w, 12);
                expect((e.h * k) / (valid[0].h * k)).toBeCloseTo(e.h / valid[0].h, 12);
            });
        }
    });

    it('keeps 180 × 140 exactly 4.5 times wider than 40 × 30 (exact, and within 1px after rounding)', () => {
        const { k, valid } = computeScale([work(180, 140), work(40, 30)], { mode: 'row', width: 1000 });
        expect((180 * k) / (40 * k)).toBe(4.5);
        const [big, small] = sizeItems(valid, k);
        expect(Math.abs(big.width - 4.5 * small.width)).toBeLessThanOrEqual(4.5); // each side is off by < 1px
        expect(big.width / small.width).toBeCloseTo(4.5, 1);
    });

    it('computes the grid k from the widest work and its share (the demo cells() rule)', () => {
        const { k } = computeScale(LOCAL, { mode: 'grid', width: 1296, share: PRESETS.catalogue.share });
        expect(180 * k).toBeCloseTo(1296 * 0.44, 9);
        expect(40 * k).toBeCloseTo((1296 * 0.44) / 4.5, 9);
    });

    it('fits a row exactly: widths plus gaps equal the container', () => {
        const { k, valid } = computeScale(LOCAL, { mode: 'row', width: 1200, gap: 16 });
        const sumCm = LOCAL.reduce((s, w) => s + w.width_cm, 0);
        expect(k).toBeCloseTo((1200 - 16 * 7) / sumCm, 12);
        expect(layoutRow(valid, k, { gap: 16 }).width).toBe(1200);
    });
});

describe('wall: the 170 cm figure', () => {
    it('is measured with the same k as the works', () => {
        expect(figureAt(2).height).toBe(340);
        expect(figureAt(1.37).height).toBe(Math.round(HUMAN_HEIGHT_CM * 1.37));
    });

    it('stands at the same scale as the works on the home wall (horizontal and vertical)', () => {
        for (const opts of [{ width: 1440, height: 640 }, { width: 375, height: 800 }]) {
            const wall = wallLayout(LOCAL, opts);
            const kFromFigure = wall.figure.height / HUMAN_HEIGHT_CM;
            wall.items.forEach((it) => expect(it.height / it.heightCm).toBeCloseTo(kFromFigure, 1));
            expect(wall.figure.height).toBe(Math.round(170 * wall.k));
        }
    });
});

describe('wall: "divarda gör" wall heights', () => {
    it('scales the wall, the work and the figure with one k taken from the wall container', () => {
        const piece = work(120, 90);
        // 360px of height: 240 cm → k 1.5, 270 cm → 1.33, 320 cm → 1.125 (all under the 1.6 px/cm cap)
        const results = WALL_HEIGHTS_CM.map((wallCm) => detailWallLayout(piece, { width: 900, height: 360, wallCm }));
        results.forEach((r, i) => {
            expect(r.ready).toBe(true);
            expect(r.wall.heightCm).toBe(WALL_HEIGHTS_CM[i]);
            expect(r.work.height / r.wall.height).toBeCloseTo(90 / WALL_HEIGHTS_CM[i], 2);
            expect(r.figure.height / r.work.height).toBeCloseTo(170 / 90, 1);
        });
        // A taller wall in the same box means a smaller k: the work reads smaller against it.
        expect(results[0].k).toBeGreaterThan(results[1].k);
        expect(results[1].k).toBeGreaterThan(results[2].k);
        expect(results[0].work.height).toBeGreaterThan(results[2].work.height);
    });

    it('does not depend on the catalogue k, hangs the centre at 150 cm and stands the figure on the floor', () => {
        const r = detailWallLayout(work(100, 80), { width: 1000, height: 432, wallCm: 270 });
        expect(r.k).toBeCloseTo(Math.min(1000 / (30 + 100 + 60 + 46 + 30), 432 / 270, PRESETS.detailWall.maxK), 12);
        expect(r.work.bottom + r.work.height / 2).toBeCloseTo(150 * r.k, 0);
        expect(r.figure.bottom).toBe(0);
        expect(r.figure.left).toBeGreaterThanOrEqual(r.work.left + r.work.width);
    });

    it('raises the wall for a work taller than it, and never hangs a work below the floor', () => {
        const r = detailWallLayout(work(80, 300), { width: 800, height: 600, wallCm: 240 });
        expect(r.wall.heightCm).toBe(0 + 300 + 30);
        expect(r.work.bottom).toBe(0);
        expect(r.work.bottom + r.work.height).toBeLessThanOrEqual(r.wall.height);
    });
});

describe('wall: limits', () => {
    it('caps k so the tallest work is never taller than maxItemHeightPx', () => {
        const s = computeScale(LOCAL, { mode: 'grid', width: 3000, share: 0.9, maxItemHeightPx: 420 });
        expect(s.limitedBy).toBe('height');
        expect(140 * s.k).toBeCloseTo(420, 9);
    });

    it('raises k to reach minItemPx on the scrolling wall, but never above a cap', () => {
        const raised = computeScale(LOCAL, { mode: 'scroll', targetK: 0.5, minItemPx: 60 });
        expect(raised.limitedBy).toBe('min');
        expect(40 * raised.k).toBeCloseTo(60, 9);

        const capped = computeScale(LOCAL, { mode: 'scroll', targetK: 0.5, minItemPx: 60, maxItemHeightPx: 140 });
        expect(capped.k).toBeCloseTo(1, 9); // 140 cm tall × 1 = 140px, the cap wins over the floor
        expect(capped.minSatisfied).toBe(false);
    });

    it('never breaks the width fit for legibility; it reports minSatisfied: false instead', () => {
        const s = computeScale([work(300, 100), work(20, 20)], { mode: 'row', width: 400, minItemPx: 48 });
        expect(s.k).toBeCloseTo(400 / 320, 12);
        expect(s.minSatisfied).toBe(false);
    });

    it('applies minK (the demo home-wall floor) and maxK', () => {
        expect(computeScale(LOCAL, { mode: 'scroll', targetK: 0.1, minK: 0.4 }).k).toBe(0.4);
        expect(computeScale(LOCAL, { mode: 'grid', width: 5000, maxK: 2 }).k).toBe(2);
        // minK never makes a fitting row overflow
        expect(computeScale(LOCAL, { mode: 'row', width: 100, minK: 0.4 }).k).toBeCloseTo(100 / 810, 12);
    });
});

describe('wall: rounding', () => {
    it('rounds edges, so ten cards and their gaps never overflow and never drift', () => {
        const ten = Array.from({ length: 10 }, (_, i) => work(33.3 + i * 7.7, 41.1 + i));
        for (const width of [999, 1000, 1001, 1287, 733]) {
            const { k, valid } = computeScale(ten, { mode: 'row', width, gap: 13 });
            const row = layoutRow(valid, k, { gap: 13 });
            const last = row.items[row.items.length - 1];
            expect(last.left + last.width).toBe(Math.round(width));
            expect(row.width).toBeLessThanOrEqual(width);
            row.items.forEach((it, i) => {
                expect(Math.abs(it.width - it.widthCm * k)).toBeLessThan(1);
                if (i > 0) expect(it.left).toBeGreaterThanOrEqual(row.items[i - 1].left + row.items[i - 1].width);
            });
        }
    });

    it('roundSpan keeps the end at round(x + size)', () => {
        expect(roundSpan(10.4, 20.4)).toEqual({ start: 10, length: 21 });
        expect(roundSpan(10.6, 20.4)).toEqual({ start: 11, length: 20 });
    });
});

describe('wall: edge cases', () => {
    it.each([
        ['zero', work(0, 50), 'not-positive'],
        ['negative', work(-10, 50), 'not-positive'],
        ['null', { width_cm: null, height_cm: 50 }, 'missing'],
        ['undefined', { height_cm: 50 }, 'missing'],
        ['a string', { width_cm: '120', height_cm: 90 }, 'not-a-number'],
        ['NaN', work(Number.NaN, 90), 'not-a-number'],
        ['Infinity', work(Number.POSITIVE_INFINITY, 90), 'not-a-number'],
        ['5000 cm', work(5000, 90), 'too-large'],
    ])('skips a work whose size is %s, and scales the rest as if it were absent', (_, bad, reason) => {
        const withBad = computeScale([...LOCAL, bad], { mode: 'grid', width: 1296, share: 0.44 });
        const clean = computeScale(LOCAL, { mode: 'grid', width: 1296, share: 0.44 });
        expect(withBad.k).toBe(clean.k);
        expect(withBad.skipped).toEqual([{ item: bad, index: LOCAL.length, reason }]);
        expect(wallLayout([...LOCAL, bad], { width: 1440, height: 640 }).items).toHaveLength(LOCAL.length);
    });

    it('accepts the largest allowed size and rejects anything above it', () => {
        expect(isValidDims(MAX_DIMENSION_CM, 10)).toBe(true);
        expect(isValidDims(MAX_DIMENSION_CM + 1, 10)).toBe(false);
    });

    it('returns k = 0, ready: false for an empty list or a list of invalid works', () => {
        for (const list of [[], null, undefined, [work(0, 0)]]) {
            const s = computeScale(list, { mode: 'row', width: 1000 });
            expect(s).toMatchObject({ k: 0, ready: false });
            expect(wallLayout(list, { width: 1440, height: 640 })).toMatchObject({ k: 0, ready: false, items: [] });
        }
    });

    it('returns k = 0, ready: false while the container has no width yet (first render)', () => {
        for (const width of [0, -5, Number.NaN, undefined]) {
            expect(computeScale(LOCAL, { mode: 'grid', width })).toMatchObject({ k: 0, ready: false });
        }
        expect(wallLayout(LOCAL, { width: 0 })).toMatchObject({ k: 0, ready: false });
        expect(wallLayout(LOCAL, { width: 1440, height: 0 })).toMatchObject({ k: 0, ready: false });
        expect(detailWallLayout(LOCAL[0], { width: 0, height: 400 })).toMatchObject({ k: 0, ready: false, reason: 'no-room' });
    });

    it('fits a single work within its limits', () => {
        // 100 cm wide would fill 500px at k 5, but 80 cm tall under a 300px cap allows only 300 / 80 = 3.75.
        const s = computeScale([work(100, 80)], { mode: 'row', width: 500, maxItemHeightPx: 300 });
        expect(s.k).toBe(3.75);
        expect(s.limitedBy).toBe('height');
        expect(computeScale([work(100, 80)], { mode: 'row', width: 500 }).k).toBe(5);
    });

    it('gives works of the same size the same pixels', () => {
        const same = Array.from({ length: 6 }, () => work(80, 60));
        const { k, valid } = computeScale(same, { mode: 'row', width: 1000, gap: 20 });
        const sizes = sizeItems(valid, k);
        expect(new Set(sizes.map((s) => s.width)).size).toBe(1);
        expect(new Set(sizes.map((s) => s.height)).size).toBe(1);
    });

    it('keeps a work ten times larger than the rest at ten times the size (no per-card rescue)', () => {
        const list = [work(300, 200), work(30, 20), work(30, 20)];
        const { k, valid } = computeScale(list, { mode: 'grid', width: 1200, share: 0.5, maxItemHeightPx: 500 });
        const [big, small] = sizeItems(valid, k);
        expect(big.width / small.width).toBeCloseTo(10, 1);
        expect(big.height).toBeLessThanOrEqual(500);
    });
});

describe('wall: the home wall (horizontal and vertical)', () => {
    it('turns vertical below the md breakpoint (768px), the same one the header uses', () => {
        expect(VERTICAL_BELOW_PX).toBe(768);
        expect(wallLayout(LOCAL, { width: 767, height: 800 }).vertical).toBe(true);
        expect(wallLayout(LOCAL, { width: 768, height: 800 }).vertical).toBe(false);
    });

    it('horizontal: k = (height − caption band) / 270 cm wall, centres on the 150 cm line, the figure on the floor, gaps ≥ minGapPx', () => {
        const wall = wallLayout(LOCAL, { width: 1440, height: 640 });
        expect(wall.wallCm).toBe(270); // the tallest local work (140 cm) tops out at 220 cm + 30 cm air: under 270
        expect(wall.k).toBeCloseTo((640 - 64) / 270, 12);
        expect(wall.floor).toBe(Math.round(270 * wall.k));
        wall.items.forEach((it) => {
            // top and height are rounded separately, so the centre may sit up to 1px off the exact line
            expect(Math.abs(it.top + it.height / 2 - (wall.floor - 150 * wall.k))).toBeLessThanOrEqual(1);
            expect(it.top).toBeGreaterThanOrEqual(0); // nothing leaves the top of the wall
        });
        expect(wall.figure.top + wall.figure.height).toBe(wall.floor);
        wall.items.slice(1).forEach((it, i) => expect(it.left - (wall.items[i].left + wall.items[i].width)).toBeGreaterThanOrEqual(PRESETS.homeWall.minGapPx - 1));
        expect(wall.height).toBe(640);
    });

    it('horizontal: uses the same wall heights as "divarda gör" and the same k for the same wall and height', () => {
        // Works that fit under every wall (100 × 80 tops out at 190 cm + 30 cm air = 220 cm < 240 cm):
        const ks = WALL_HEIGHTS_CM.map((wallCm) => wallLayout([work(100, 80), work(40, 30)], { width: 1440, height: 564, wallCm }).k);
        expect(ks).toEqual(WALL_HEIGHTS_CM.map((c) => 500 / c));
        // With the local works a 240 cm wall is raised to 250 cm (140 cm work: 80 → 220 cm, + 30 cm air).
        expect(wallLayout(LOCAL, { width: 1440, height: 564, wallCm: 240 }).wallCm).toBe(250);
        const home = wallLayout([work(100, 80)], { width: 1440, height: 500 + 64, wallCm: 270 });
        const detail = detailWallLayout(work(100, 80), { width: 5000, height: 500, wallCm: 270, maxK: Infinity });
        expect(home.k).toBeCloseTo(detail.k, 12);
        expect(home.items[0].height).toBe(detail.work.height);
    });

    it('horizontal: a work taller than the wall raises the wall instead of leaving the canvas', () => {
        const wall = wallLayout([work(120, 300), work(40, 30)], { width: 1440, height: 564 });
        expect(wall.wallCm).toBe(300 + 30); // centre 150 → bottom 0, top 300, + 30 cm air
        expect(wall.items[0].top).toBeGreaterThanOrEqual(0);
        expect(wall.items[0].top + wall.items[0].height).toBe(wall.floor);
    });

    it('horizontal: keeps the 0.4 px/cm floor on a very short container', () => {
        expect(wallLayout(LOCAL, { width: 1440, height: 120 }).k).toBe(0.4);
    });

    it('vertical (375px): k from the width, every work fits beside the figure, works never overlap', () => {
        const wall = wallLayout(LOCAL, { width: 335 });
        expect(wall.vertical).toBe(true);
        expect(wall.k).toBeCloseTo(335 / (46 + 18 + 180), 12);
        wall.items.forEach((it, i) => {
            expect(it.left + it.width).toBeLessThanOrEqual(335);
            expect(it.left).toBeGreaterThanOrEqual(wall.figure.width);
            if (i > 0) expect(it.top).toBeGreaterThan(wall.items[i - 1].top + wall.items[i - 1].height);
        });
        // relative size survives the switch: 180 cm is still 4.5 × 40 cm
        expect(wall.items[0].width / wall.items[7].width).toBeCloseTo(4.5, 1);
    });

    it('lays out the eight local works with the catalogue preset at 1296px', () => {
        const { k, valid, skipped } = computeScale(LOCAL, { mode: 'grid', width: 1296, share: PRESETS.catalogue.share, minItemPx: PRESETS.catalogue.minItemPx });
        const sizes = sizeItems(valid, k);
        expect(skipped).toEqual([]);
        expect(sizes.map((s) => s.width)).toEqual([570, 475, 380, 317, 285, 222, 190, 127]);
        expect(sizes.map((s) => s.height)).toEqual([444, 348, 285, 253, 190, 158, 143, 95]);
    });
});

describe('wall: packRows (the catalogue grid)', () => {
    const K = (1296 * 0.44) / 180; // the catalogue preset at 1296px: k = 3.168
    const pack = (list, opts = {}) => packRows(list, { containerWidth: 1296, k: K, gap: 24, ...opts });

    it('packs the eight local works into three rows at 1296px, with exact pixels', () => {
        const { rows, skipped } = pack(LOCAL);
        expect(skipped).toEqual([]);
        expect(rows.map((r) => r.items.map((i) => i.item.inventory_code))).toEqual([
            ['AN-2024-031', 'AN-2023-018'],
            ['AN-2025-014', 'AN-2022-047', 'AN-2026-005', 'AN-2023-009'],
            ['AN-2021-022', 'AN-2019-003'],
        ]);
        expect(rows.map((r) => r.items.map((i) => [i.left, i.cardWidth, i.fieldWidth, i.fieldHeight]))).toEqual([
            [[0, 570, 570, 444], [594, 475, 475, 348]],
            [[0, 380, 380, 285], [404, 317, 317, 253], [745, 285, 285, 190], [1054, 222, 222, 158]],
            [[0, 190, 190, 143], [214, 155, 127, 95]],
        ]);
        expect(rows.map((r) => r.zoneHeight)).toEqual([444, 285, 143]);
        expect(rows.map((r) => r.width)).toEqual([1069, 1276, 369]);
    });

    it('keeps one k across rows', () => {
        const { rows } = pack(LOCAL);
        const ks = rows.flatMap((r) => r.items.map((i) => i.fieldHeight / i.heightCm));
        ks.forEach((k) => expect(k).toBeCloseTo(K, 1));
    });

    it('gives each row the zone of its own tallest field, not the tallest of the list', () => {
        const { rows } = pack(LOCAL);
        rows.forEach((r) => expect(r.zoneHeight).toBe(Math.max(...r.items.map((i) => i.fieldHeight))));
        expect(rows[2].zoneHeight).toBeLessThan(rows[0].zoneHeight);
    });

    it('bottom-aligns the fields of a row: every field ends on the zone line', () => {
        pack(LOCAL).rows.forEach((r) => r.items.forEach((i) => expect(i.fieldTop + i.fieldHeight).toBe(r.zoneHeight)));
    });

    it('keeps a lone card that is wider than the container at its size', () => {
        const { rows } = packRows([work(300, 100), work(40, 30)], { containerWidth: 500, k: 2, gap: 24 });
        expect(rows).toHaveLength(2);
        expect(rows[0].items[0].cardWidth).toBe(600);
        expect(rows[0].items[0].fieldWidth).toBe(600);
    });

    it('leaves the last row left-aligned and unstretched', () => {
        const { rows } = pack(LOCAL);
        const last = rows[rows.length - 1];
        expect(last.items[0].left).toBe(0);
        expect(last.width).toBeLessThan(1296);
        expect(last.items.map((i) => i.cardWidth)).toEqual([190, 155]);
    });

    it('centres a narrow field in its 155px card', () => {
        const small = pack(LOCAL).rows[2].items[1];
        expect(small.cardWidth).toBe(155);
        expect(small.fieldLeft).toBe(Math.round((155 - 127) / 2));
    });

    it('drops invalid sizes into skipped without disturbing the packing', () => {
        const withBad = pack([...LOCAL.slice(0, 4), work(0, 50, 'bad'), { inventory_code: 'none' }, ...LOCAL.slice(4)]);
        expect(withBad.skipped.map((s) => [s.item.inventory_code, s.reason])).toEqual([['bad', 'not-positive'], ['none', 'missing']]);
        expect(withBad.rows.map((r) => r.items.map((i) => i.item.inventory_code))).toEqual(pack(LOCAL).rows.map((r) => r.items.map((i) => i.item.inventory_code)));
    });

    it('returns no rows while the width or k is not known yet', () => {
        expect(packRows(LOCAL, { containerWidth: 0, k: K }).rows).toEqual([]);
        expect(packRows(LOCAL, { containerWidth: 1296, k: 0 }).rows).toEqual([]);
    });

    it('never lets rounding push a row past the container', () => {
        const ten = Array.from({ length: 10 }, (_, i) => work(33.3 + i * 7.7, 41.1 + i));
        for (const width of [733, 999, 1287]) {
            const { k } = computeScale(ten, { mode: 'grid', width, share: 0.44 });
            packRows(ten, { containerWidth: width, k, gap: 24 }).rows.forEach((r) => {
                if (r.items.length > 1) expect(r.width).toBeLessThanOrEqual(width);
                r.items.forEach((i) => expect(i.fieldWidth).toBeLessThanOrEqual(i.cardWidth));
            });
        }
    });
});

describe('wall: partition', () => {
    it('keeps input order and indices', () => {
        const { valid, skipped } = partition([work(10, 10, 'a'), work(0, 1, 'b'), work(20, 20, 'c')]);
        expect(valid.map((e) => [e.item.inventory_code, e.index])).toEqual([['a', 0], ['c', 2]]);
        expect(skipped.map((e) => [e.item.inventory_code, e.index])).toEqual([['b', 1]]);
    });
});
