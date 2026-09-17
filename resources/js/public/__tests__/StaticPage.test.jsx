import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import StaticPage from '../pages/StaticPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('StaticPage', () => {
    it('renders the title, content, and sections', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: { slug: 'about', type: 'about', title: 'Haqqımızda', content: 'Content text.', sections: [{ key: 'hero', heading: 'Bizim tariximiz', body: 'Story.', sort_order: 0, image_url: null }] },
        }));

        render(<LocaleProvider><StaticPage params={{ slug: 'about' }} /></LocaleProvider>);

        expect(await screen.findByText('Haqqımızda')).toBeInTheDocument();
        expect(screen.getByText('Content text.')).toBeInTheDocument();
        expect(screen.getByText('Bizim tariximiz')).toBeInTheDocument();
    });

    it('renders not-found for an unresolvable slug', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(404, { message: 'Not found.' }));
        render(<LocaleProvider><StaticPage params={{ slug: 'nonexistent' }} /></LocaleProvider>);
        expect(await screen.findByText('Səhifə tapılmadı')).toBeInTheDocument();
    });
});
