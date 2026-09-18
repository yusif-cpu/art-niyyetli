import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
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

    it('sets document.title from the page title', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: { slug: 'about', type: 'about', title: 'Haqqımızda', content: 'Content text.', sections: [] },
        }));

        render(<LocaleProvider><StaticPage params={{ slug: 'about' }} /></LocaleProvider>);

        await waitFor(() => expect(document.title).toBe('Haqqımızda — ArtNiyyətli'));
    });

    it('does not crash when the locale changes after the page has already loaded', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: { slug: 'about', type: 'about', title: 'Haqqımızda', content: 'Content text.', sections: [] },
        }));

        render(<LocaleProvider><LocaleSwitcher /><StaticPage params={{ slug: 'about' }} /></LocaleProvider>);

        await screen.findByText('Haqqımızda');

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await waitFor(() => expect(screen.getAllByText('Haqqımızda').length).toBeGreaterThan(0));
    });
});
