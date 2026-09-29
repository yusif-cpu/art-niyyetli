import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { usePageMeta } from '../lib/usePageMeta.js';
import { LocaleProvider, useLocale } from '../i18n/LocaleContext.jsx';

function meta(name) {
    return document.querySelector(`meta[name="${name}"]`);
}

function ogMeta(property) {
    return document.querySelector(`meta[property="${property}"]`);
}

function alternate(hreflang) {
    return document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
}

function renderMeta(props) {
    return renderHook(() => usePageMeta(props), { wrapper: LocaleProvider });
}

describe('usePageMeta', () => {
    beforeEach(() => {
        document.title = '';
        document.documentElement.lang = '';
        document.querySelectorAll('meta[name="description"], meta[name="robots"], meta[property^="og:"], link[rel="canonical"], link[rel="alternate"]').forEach((el) => el.remove());
        try {
            localStorage.removeItem('public-locale');
        } catch {
            // localStorage unavailable in this environment — locale just falls back to its default.
        }
    });

    it('sets document.title', () => {
        renderMeta({ title: 'Sunset Over Baku | ArtNiyyətli' });

        expect(document.title).toBe('Sunset Over Baku | ArtNiyyətli');
    });

    it('upserts the description meta tag', () => {
        renderMeta({ title: 'x', description: 'An oil painting.' });

        expect(meta('description').getAttribute('content')).toBe('An oil painting.');
    });

    it('removes the description meta tag when description is omitted', () => {
        renderMeta({ title: 'x', description: 'first' });
        renderMeta({ title: 'x' });

        expect(meta('description')).toBeNull();
    });

    it('upserts the canonical link from the current location', () => {
        renderMeta({ title: 'x' });

        const canonical = document.querySelector('link[rel="canonical"]');
        expect(canonical.getAttribute('href')).toBe(`${window.location.origin}${window.location.pathname}`);
    });

    it('reuses the same tag across re-renders instead of duplicating it', () => {
        const { rerender } = renderHook(({ title }) => usePageMeta({ title }), { wrapper: LocaleProvider, initialProps: { title: 'First' } });
        rerender({ title: 'Second' });

        expect(document.title).toBe('Second');
        expect(document.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    });

    it('sets a noindex robots meta tag when noIndex is true, and removes it otherwise', () => {
        renderMeta({ title: 'x', noIndex: true });
        expect(meta('robots').getAttribute('content')).toBe('noindex, follow');

        renderMeta({ title: 'x' });
        expect(meta('robots')).toBeNull();
    });

    it('removes the canonical and hreflang links on a noIndex page instead of pointing them at the invalid URL', () => {
        renderMeta({ title: 'x' });
        expect(document.querySelector('link[rel="canonical"]')).not.toBeNull();

        renderMeta({ title: 'x', noIndex: true });
        expect(document.querySelector('link[rel="canonical"]')).toBeNull();
        expect(alternate('az')).toBeNull();
        expect(alternate('en')).toBeNull();
        expect(alternate('x-default')).toBeNull();
    });

    it('sets html[lang] and og:locale from the active locale, and a self-referencing hreflang pair', () => {
        renderMeta({ title: 'x' });

        expect(document.documentElement.lang).toBe('az');
        expect(ogMeta('og:locale').getAttribute('content')).toBe('az_AZ');
        const here = `${window.location.origin}${window.location.pathname}`;
        expect(alternate('az').getAttribute('href')).toBe(here);
        expect(alternate('en').getAttribute('href')).toBe(here);
        expect(alternate('x-default').getAttribute('href')).toBe(here);
    });

    it('follows a locale switch: html[lang] and og:locale update to en_US', async () => {
        function Harness(props) {
            const { setLocale } = useLocale();
            usePageMeta(props);

            return <button onClick={() => setLocale('en')}>switch</button>;
        }

        render(<LocaleProvider><Harness title="x" /></LocaleProvider>);
        expect(document.documentElement.lang).toBe('az');

        await userEvent.click(screen.getByRole('button', { name: 'switch' }));

        expect(document.documentElement.lang).toBe('en');
        expect(ogMeta('og:locale').getAttribute('content')).toBe('en_US');
    });

    it('mirrors og:title/og:description from title/description when no explicit og override is passed', () => {
        renderMeta({ title: 'Artists | ArtNiyyətli', description: 'The gallery represented artists.' });

        expect(ogMeta('og:title').getAttribute('content')).toBe('Artists | ArtNiyyətli');
        expect(ogMeta('og:description').getAttribute('content')).toBe('The gallery represented artists.');
    });

    it('lets an explicit og override win over the plain title/description', () => {
        renderMeta({ title: 'Full Title | ArtNiyyətli', description: 'Full description.', og: { title: 'OG Title', description: 'OG description.' } });

        expect(ogMeta('og:title').getAttribute('content')).toBe('OG Title');
        expect(ogMeta('og:description').getAttribute('content')).toBe('OG description.');
    });
});
