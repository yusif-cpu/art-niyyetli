import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { usePageMeta } from '../lib/usePageMeta.js';

function meta(name) {
    return document.querySelector(`meta[name="${name}"]`);
}

describe('usePageMeta', () => {
    beforeEach(() => {
        document.title = '';
        document.querySelectorAll('meta[name="description"], meta[name="robots"], link[rel="canonical"]').forEach((el) => el.remove());
    });

    it('sets document.title', () => {
        renderHook(() => usePageMeta({ title: 'Sunset Over Baku — ArtNiyyətli' }));

        expect(document.title).toBe('Sunset Over Baku — ArtNiyyətli');
    });

    it('upserts the description meta tag', () => {
        renderHook(() => usePageMeta({ title: 'x', description: 'An oil painting.' }));

        expect(meta('description').getAttribute('content')).toBe('An oil painting.');
    });

    it('removes the description meta tag when description is omitted', () => {
        renderHook(() => usePageMeta({ title: 'x', description: 'first' }));
        renderHook(() => usePageMeta({ title: 'x' }));

        expect(meta('description')).toBeNull();
    });

    it('upserts the canonical link from the current location', () => {
        renderHook(() => usePageMeta({ title: 'x' }));

        const canonical = document.querySelector('link[rel="canonical"]');
        expect(canonical.getAttribute('href')).toBe(`${window.location.origin}${window.location.pathname}`);
    });

    it('reuses the same tag across re-renders instead of duplicating it', () => {
        const { rerender } = renderHook(({ title }) => usePageMeta({ title }), { initialProps: { title: 'First' } });
        rerender({ title: 'Second' });

        expect(document.title).toBe('Second');
        expect(document.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    });

    it('sets a noindex robots meta tag when noIndex is true, and removes it otherwise', () => {
        renderHook(() => usePageMeta({ title: 'x', noIndex: true }));
        expect(meta('robots').getAttribute('content')).toBe('noindex, follow');

        renderHook(() => usePageMeta({ title: 'x' }));
        expect(meta('robots')).toBeNull();
    });
});
