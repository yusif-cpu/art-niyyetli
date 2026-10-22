import { describe, it, expect } from 'vitest';
import { buttonClass } from '../lib/buttons.js';

const classes = (kind, surface) => buttonClass(kind, surface).split(/\s+/);

describe('buttonClass (krem-bordo buttons)', () => {
    it('is square, 14px 600, 17px × 30px with its 1px border, and a 44px touch box', () => {
        const c = classes('primary', 'cream');
        expect(c).toEqual(expect.arrayContaining(['border', 'px-[29px]', 'py-[16px]', 'text-[14px]', 'font-semibold', 'min-h-11']));
        expect(c.join(' ')).not.toMatch(/rounded/);
    });

    it('on cream: primary wine fill with surface text, secondary a wine line with wine text', () => {
        expect(classes('primary', 'cream')).toEqual(expect.arrayContaining(['bg-wine', 'text-surface', 'border-transparent']));
        expect(classes('secondary', 'cream')).toEqual(expect.arrayContaining(['border-wine', 'text-wine']));
        expect(classes('secondary', 'cream')).not.toContain('bg-wine');
    });

    it('on wine: primary surface fill with wine text, secondary a surface line at 55% with surface text', () => {
        expect(classes('primary', 'wine')).toEqual(expect.arrayContaining(['bg-surface', 'text-wine']));
        expect(classes('secondary', 'wine')).toEqual(expect.arrayContaining(['border-surface/55', 'text-surface']));
    });
});
