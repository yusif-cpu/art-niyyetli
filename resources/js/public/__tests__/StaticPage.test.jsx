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

    it('shows the sections in sort order, heading and text, the text in reading type', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: {
                slug: 'about', type: 'about', title: 'Haqqımızda', content: 'Intro.',
                sections: [
                    { key: 'second', heading: 'İkinci', body: 'Two.', sort_order: 2, image_url: null },
                    { key: 'first', heading: 'Birinci', body: 'One.', sort_order: 1, image_url: null },
                ],
            },
        }));
        render(<LocaleProvider><StaticPage params={{ slug: 'about' }} /></LocaleProvider>);

        await screen.findByText('Intro.');
        expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Birinci', 'İkinci']);
        expect(screen.getByText('One.')).toHaveClass('font-editorial', 'text-reading', 'whitespace-pre-line');
        expect(screen.getByRole('heading', { level: 1, name: 'Haqqımızda' })).toHaveClass('text-display');
    });

    it('leaves out a section whose text is empty, and an empty page text', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: {
                slug: 'about', type: 'about', title: 'Haqqımızda', content: '',
                sections: [
                    { key: 'empty', heading: 'Boş bölmə', body: '  ', sort_order: 0, image_url: null },
                    { key: 'null', heading: 'Null bölmə', body: null, sort_order: 1, image_url: null },
                    { key: 'full', heading: 'Dolu bölmə', body: 'Text.', sort_order: 2, image_url: null },
                ],
            },
        }));
        const { container } = render(<LocaleProvider><StaticPage params={{ slug: 'about' }} /></LocaleProvider>);

        await screen.findByText('Dolu bölmə');
        expect(screen.queryByText('Boş bölmə')).not.toBeInTheDocument();
        expect(screen.queryByText('Null bölmə')).not.toBeInTheDocument();
        expect(container.querySelectorAll('section')).toHaveLength(1);
        expect([...container.querySelectorAll('p')].filter((p) => p.textContent.trim() === '')).toHaveLength(0);
    });

    it('shows [PLACEHOLDER] legal copy as it is, not hidden', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: { slug: 'terms', type: 'custom', title: 'İstifadə şərtləri', content: '[PLACEHOLDER] Hüquqi mətn gözlənilir.', sections: [] },
        }));
        render(<LocaleProvider><StaticPage params={{ slug: 'terms' }} /></LocaleProvider>);

        expect(await screen.findByText('[PLACEHOLDER] Hüquqi mətn gözlənilir.')).toBeVisible();
    });

    it('renders the text as plain text, never HTML', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse(200, {
            data: { slug: 'about', type: 'about', title: 'T', content: '<img src=x onerror=alert(1)>', sections: [] },
        }));
        const { container } = render(<LocaleProvider><StaticPage params={{ slug: 'about' }} /></LocaleProvider>);

        expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
        expect(container.querySelector('img')).toBeNull();
    });

    it('shows a static skeleton while loading, an error with a retry, and no Signal or old classes', async () => {
        let calls = 0;
        global.fetch = vi.fn(() => Promise.resolve(++calls === 1 ? jsonResponse(500, {}) : jsonResponse(200, { data: { slug: 'about', type: 'about', title: 'Haqqımızda', content: 'Content text.', sections: [] } })));
        const { container } = render(<LocaleProvider><StaticPage params={{ slug: 'about' }} /></LocaleProvider>);

        expect(screen.getByTestId('page-skeleton')).toHaveAttribute('aria-busy', 'true');
        await userEvent.click(await screen.findByRole('button', { name: 'Yenidən cəhd et' }));
        expect(await screen.findByText('Content text.')).toBeInTheDocument();
        expect(container.innerHTML).not.toMatch(/signal|rounded|neutral-/);
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

        await waitFor(() => expect(document.title).toBe('Haqqımızda | ArtNiyyətli'));
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

    it('re-fetches and updates a legal page title and content when the locale changes', async () => {
        localStorage.setItem('public-locale', 'az');
        global.fetch = vi.fn((url) => {
            const isEn = url.includes('locale=en');
            return Promise.resolve(jsonResponse(200, {
                data: {
                    slug: 'privacy-policy',
                    type: 'custom',
                    title: isEn ? 'Privacy Policy' : 'Məxfilik siyasəti',
                    content: isEn ? '[PLACEHOLDER] English legal copy.' : '[PLACEHOLDER] Azərbaycanca hüquqi mətn.',
                    sections: [],
                },
            }));
        });

        render(<LocaleProvider><LocaleSwitcher /><StaticPage params={{ slug: 'privacy-policy' }} /></LocaleProvider>);

        await screen.findByText('Məxfilik siyasəti');
        expect(screen.getByText('[PLACEHOLDER] Azərbaycanca hüquqi mətn.')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        await screen.findByText('Privacy Policy');
        expect(screen.getByText('[PLACEHOLDER] English legal copy.')).toBeInTheDocument();
        expect(screen.queryByText('Məxfilik siyasəti')).not.toBeInTheDocument();
    });
});
