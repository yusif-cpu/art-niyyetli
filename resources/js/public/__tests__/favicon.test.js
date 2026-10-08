import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

// The favicon set is static files and the public shell's <head>; these checks read them directly.
const root = resolve(__dirname, '../../../..');
const read = (path) => readFileSync(resolve(root, path));
const shell = read('resources/views/public.blade.php').toString();

// A PNG's size sits in its IHDR chunk; colour type 6 is RGBA (has an alpha channel), 2 is RGB.
function png(path) {
    const buffer = read(path);
    expect(buffer.subarray(1, 4).toString()).toBe('PNG');

    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colourType: buffer[25] };
}

describe('favicon set', () => {
    it('draws the mark alone in brand red in favicon.svg, with no style attribute and no background', () => {
        const svg = read('public/favicon.svg').toString();
        expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
        expect(svg).not.toMatch(/style|currentColor|<rect|<text/i);
        // Every fill is the brand red. (was: the old mark's three paths) — the paths are the brand mark's own, whatever
        // their number: the favicon is brand/artniyyetli-mark.svg with currentColor fixed to #fc0203.
        const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1].toLowerCase());
        expect(fills.length).toBeGreaterThan(0);
        expect(fills.every((fill) => fill === '#fc0203')).toBe(true);
        const paths = (text) => [...text.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
        const mark = read('brand/artniyyetli-mark.svg').toString();
        expect(paths(svg)).toEqual(paths(mark));
        expect(/viewBox="([^"]+)"/.exec(svg)[1]).toBe(/viewBox="([^"]+)"/.exec(mark)[1]);
    });

    it('ships a transparent 32px PNG and a 180px apple-touch-icon on a solid background', () => {
        expect(png('public/favicon-32.png')).toEqual({ width: 32, height: 32, colourType: 6 });
        // iOS fills transparency with black: this one is opaque (the surface colour behind the mark).
        expect(png('public/apple-touch-icon.png')).toEqual({ width: 180, height: 180, colourType: 2 });
    });

    it('links the SVG icon, the 32px PNG fallback and the apple-touch-icon, and sets the wine theme colour', () => {
        expect(shell).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
        expect(shell).toContain('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">');
        expect(shell).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
        expect(shell).toContain('<meta name="theme-color" content="#3E0B0A">');
        expect(shell.indexOf('favicon.svg')).toBeLessThan(shell.indexOf('favicon-32.png'));
    });

    it('leaves Laravel\'s favicon.ico in place', () => {
        expect(statSync(resolve(root, 'public/favicon.ico')).isFile()).toBe(true);
    });
});
