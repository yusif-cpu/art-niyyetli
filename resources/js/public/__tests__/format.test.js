import { describe, it, expect } from 'vitest';
import { formatDimensions, formatPrice } from '../lib/format.js';

const NBSP = ' ';

describe('format', () => {
    it('groups thousands with non-breaking spaces and never shows .00', () => {
        expect(formatPrice(6400, 'AZN')).toBe(`6${NBSP}400${NBSP}AZN`);
        expect(formatPrice(900, 'AZN')).toBe(`900${NBSP}AZN`);
        expect(formatPrice(1250000, 'AZN')).toBe(`1${NBSP}250${NBSP}000${NBSP}AZN`);
        expect(formatPrice(4500.5, 'AZN')).toBe(`4${NBSP}500,50${NBSP}AZN`);
    });

    it('returns null for a hidden or missing price', () => {
        expect(formatPrice(null, null)).toBeNull();
        expect(formatPrice(undefined, 'AZN')).toBeNull();
    });

    it('writes width first with the × sign, "sm" in Azerbaijani and "cm" in English', () => {
        expect(formatDimensions(180, 140, 'az')).toBe(`180${NBSP}×${NBSP}140${NBSP}sm`);
        expect(formatDimensions(180, 140, 'en')).toBe(`180${NBSP}×${NBSP}140${NBSP}cm`);
        expect(formatDimensions(120.5, 90, 'az')).toBe(`120,5${NBSP}×${NBSP}90${NBSP}sm`);
        expect(formatDimensions(120.5, 90, 'en')).toBe(`120.5${NBSP}×${NBSP}90${NBSP}cm`);
        expect(formatDimensions(180, 140, 'az')).not.toMatch(/x/);
    });

    it('returns null for unusable dimensions', () => {
        expect(formatDimensions(0, 10)).toBeNull();
        expect(formatDimensions(null, 10)).toBeNull();
    });
});
