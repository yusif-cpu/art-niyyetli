import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

// The design tokens are CSS; these checks read the theme block itself, since jsdom does not compute Tailwind values.
const css = readFileSync(resolve(__dirname, '../../../css/public.css'), 'utf8');
const token = (name) => new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1].trim();

describe('design tokens', () => {
    it('allows no rounded corner: --radius-input is 0 (the token name stays so no class changes)', () => {
        expect(token('radius-input')).toBe('0px');
    });

    it('keeps page titles clearly above section titles on tablets: display 38px, heading 28px at their minimum', () => {
        expect(token('text-display')).toBe('clamp(38px, 4.6vw, 59px)');
        expect(token('text-heading')).toBe('clamp(28px, 3.4vw, 48px)');
    });
});
