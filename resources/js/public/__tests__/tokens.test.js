import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

// The design tokens are CSS; these checks read the theme block itself, since jsdom does not compute Tailwind values.
const css = readFileSync(resolve(__dirname, '../../../css/public.css'), 'utf8');
// A declaration ends with ";" on its own line, which skips mentions of the token inside comments.
const token = (name) => new RegExp(`^\\s*--${name}:\\s*([^;\\n]+);`, 'm').exec(css)?.[1].trim();

describe('design tokens', () => {
    it('allows no rounded corner: --radius-input is 0 (the token name stays so no class changes)', () => {
        expect(token('radius-input')).toBe('0px');
    });

    it('keeps the brand red as its own token, apart from Signal (the logo is not counted as Signal)', () => {
        expect(token('color-brand')).toBe('#fc0203');
        expect(token('color-signal')).toBe('#f51000');
        expect(token('color-signal-ink')).toBe('#da0f02');
        expect(token('color-wine')).toBe('#3e0b0a');
    });

    it('adds the krem-bordo tokens from the same palette and darkens ink-muted to #6E6359', () => {
        expect(token('color-surface')).toBe('#f4f0e8');
        expect(token('color-ink')).toBe('#1a1614');
        expect(token('color-ink-muted')).toBe('#6e6359');
        expect(token('color-surface-sunk')).toBe('#ebe4d7');
        expect(token('color-wine-deep')).toBe('#2c0807');
        expect(token('color-wine-muted')).toBe('#d7c6be');
        expect(token('color-wine-accent')).toBe('#f0d9cf');
    });

    it('keeps page titles clearly above section titles on tablets: display 38px, heading 28px at their minimum', () => {
        expect(token('text-display')).toBe('clamp(38px, 4.6vw, 59px)');
        expect(token('text-heading')).toBe('clamp(28px, 3.4vw, 48px)');
    });

    it('sets titles light: page titles at weight 300 in their sizes, section titles their own 28–36px level', () => {
        for (const level of ['text-hero', 'text-display', 'text-heading']) expect(token(`${level}--font-weight`)).toBe('300');
        expect(token('text-section')).toBe('clamp(28px, 2.4vw, 36px)');
        expect(token('text-section--font-weight')).toBe('300');
        expect(token('text-section--letter-spacing')).toBe('-0.01em');
    });

    it('draws links as text with a 1px line 3px under it (link-line)', () => {
        const block = css.slice(css.indexOf('@utility link-line'), css.indexOf('}', css.indexOf('@utility link-line')));
        expect(block).toMatch(/border-bottom: 1px solid currentColor;/);
        expect(block).toMatch(/padding-bottom: 3px;/);
    });

    it('keeps the 14px phone floor for the navigation too (13px on desktops, 14px in the phone menu)', () => {
        expect(token('text-nav')).toBe('13px');
        const phone = css.slice(css.indexOf('@media (max-width: 767px)'), css.indexOf('}', css.indexOf('@media (max-width: 767px)')));
        expect(phone).toMatch(/--text-nav: 14px;/);
    });

    it('sets every section title (h2) of the public pages in text-section, none in the old 20px / 500 text-subheading', () => {
        const dir = resolve(__dirname, '..');
        const sources = ['pages', 'components', 'layout'].flatMap((sub) => readdirSync(resolve(dir, sub)).filter((f) => f.endsWith('.jsx')).map((f) => readFileSync(resolve(dir, sub, f), 'utf8')));
        for (const source of sources) expect(source).not.toMatch(/<h2[^>]*text-subheading/);
    });

    it('loads Spectral 300 (roman) beside 400, from the same self-hosted family', () => {
        expect(css).toMatch(/font-family: 'Spectral';\s*font-style: normal;\s*font-display: swap;\s*font-weight: 300;/);
    });
});
