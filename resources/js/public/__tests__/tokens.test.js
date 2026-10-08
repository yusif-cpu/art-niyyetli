import { readFileSync } from 'node:fs';
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

    it('keeps page titles clearly above section titles on tablets: display 38px, heading 28px at their minimum', () => {
        expect(token('text-display')).toBe('clamp(38px, 4.6vw, 59px)');
        expect(token('text-heading')).toBe('clamp(28px, 3.4vw, 48px)');
    });
});
