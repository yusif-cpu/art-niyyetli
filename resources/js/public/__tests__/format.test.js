import { describe, it, expect } from 'vitest';
import { formatDate, formatDateRange, formatDimensions, formatPrice, phoneHref } from '../lib/format.js';

const NBSP = ' ';

describe('format', () => {
    it('makes every tel: link international, whatever form the admin wrote the number in', () => {
        expect(phoneHref('070 353 05 12')).toBe('tel:+994703530512');
        expect(phoneHref('(070) 353-05-12')).toBe('tel:+994703530512');
        expect(phoneHref('+994 70 353 05 12')).toBe('tel:+994703530512');
        expect(phoneHref('00994 70 353 05 12')).toBe('tel:+994703530512');
        expect(phoneHref('994 70 353 05 12')).toBe('tel:+994703530512');
        expect(phoneHref('')).toBeNull();
        expect(phoneHref(null)).toBeNull();
    });

    it('keeps the admin\'s value (whitespace removed only) when the result is not +994 and nine digits', () => {
        // One digit too few, one too many: a +994 in front would make a link that dials nothing.
        expect(phoneHref('070 353 05 1')).toBe('tel:070353051');
        expect(phoneHref('070 353 05 123')).toBe('tel:07035305123');
        expect(phoneHref('+994 70 353 05 1')).toBe('tel:+99470353051');
        // Punctuation stays as written; only whitespace (tabs and non-breaking spaces too) goes.
        expect(phoneHref('(070) 353-05-1')).toBe('tel:(070)353-05-1');
        expect(phoneHref('070 353\t05 1')).toBe('tel:070353051');
        // A short local number and a foreign number are not Azerbaijani mobile numbers either.
        expect(phoneHref('12 34')).toBe('tel:1234');
        expect(phoneHref('+44 20 7946 0958')).toBe('tel:+442079460958');
    });

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

    it('spells dates out with its own month names, in both languages, and ranges with an en dash', () => {
        expect(formatDate('2027-04-01', 'az')).toBe('1 aprel 2027');
        expect(formatDate('2027-04-01', 'en')).toBe('1 April 2027');
        expect(formatDate('2026-09-10T09:30:00+04:00', 'az')).toBe('10 sentyabr 2026');
        expect(formatDateRange('2027-04-01', '2027-04-30', 'az')).toBe('1 aprel 2027 – 30 aprel 2027');
        expect(formatDateRange('2027-04-01', '2027-04-01', 'az')).toBe('1 aprel 2027');
        expect(formatDate(null)).toBeNull();
        expect(formatDate('soon')).toBeNull();
    });

    it('returns null for unusable dimensions', () => {
        expect(formatDimensions(0, 10)).toBeNull();
        expect(formatDimensions(null, 10)).toBeNull();
    });
});
