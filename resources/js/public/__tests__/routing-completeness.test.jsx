import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

describe('Public app routing completeness', () => {
    const IMPLEMENTED_PAGES = [
        'home', 'catalogue', 'artwork-detail', 'artists', 'artist-detail',
        'exhibitions', 'exhibition-detail', 'articles', 'article-detail', 'static-page',
    ];

    it('does not leave PlaceholderPage wired up in the PAGES map for any implemented route', () => {
        const appSource = readFileSync(path.resolve(process.cwd(), 'resources/js/public/App.jsx'), 'utf-8');
        const pagesBlockMatch = appSource.match(/const PAGES = \{([\s\S]*?)\n\};/);
        expect(pagesBlockMatch, 'Could not find the PAGES map in App.jsx').not.toBeNull();

        const pagesBlock = pagesBlockMatch[1];

        IMPLEMENTED_PAGES.forEach((key) => {
            const keyPattern = new RegExp(`(?:'${key}'|"${key}"|\\b${key}\\b)\\s*:\\s*(\\w+)`);
            const match = pagesBlock.match(keyPattern);

            expect(match, `PAGES is missing a mapping for "${key}"`).not.toBeNull();
            expect(match[1], `PAGES["${key}"] should not be PlaceholderPage`).not.toBe('PlaceholderPage');
        });
    });
});
