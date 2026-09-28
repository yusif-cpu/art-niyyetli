import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import CataloguePage from '../pages/CataloguePage.jsx';
import ArtistsPage from '../pages/ArtistsPage.jsx';
import ExhibitionsPage from '../pages/ExhibitionsPage.jsx';
import ArticlesPage from '../pages/ArticlesPage.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

describe('PageHeader', () => {
    it('shows the label, the text-display h1, the description and a 1px line, step-7 above and step-6 below', () => {
        render(<PageHeader label="Təmsilçilik" title="Rəssamlar" description="Qalereyanın rəssamları." aside={<p>8 əsər</p>} />);

        const band = screen.getByTestId('page-header');
        expect(band).toHaveClass('border-b', 'border-line', 'pt-step-7', 'pb-step-6');
        expect(within(band).getByText('Təmsilçilik')).toHaveClass('text-label', 'text-ink-muted', 'mb-step-2');
        expect(within(band).getByRole('heading', { level: 1, name: 'Rəssamlar' })).toHaveClass('text-display');
        expect(within(band).getByText('Qalereyanın rəssamları.')).toHaveClass('text-reading-sm', 'text-ink-muted');
        expect(within(band).getByText('8 əsər')).toBeInTheDocument();
    });

    it('leaves the description out when there is none', () => {
        render(<PageHeader label="Təqvim" title="Sərgilər" />);

        expect(screen.getByTestId('page-header').querySelectorAll('p')).toHaveLength(1); // the label only
    });
});

describe('the list pages share the header band', () => {
    beforeEach(() => {
        localStorage.removeItem('public-locale');
        global.fetch = vi.fn(() => Promise.resolve(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } })));
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 1296 } }]); }
            disconnect() {}
        };
    });

    it.each([
        ['catalogue', CataloguePage, 'Kolleksiya', 'Əsərlər'],
        ['artists', ArtistsPage, 'Təmsilçilik', 'Rəssamlar'],
        ['exhibitions', ExhibitionsPage, 'Təqvim', 'Sərgilər'],
        ['journal', ArticlesPage, 'Məqalələr', 'Jurnal'],
    ])('%s: one PageHeader with its label over the h1, and no other h1 or old border', async (_name, Page, label, title) => {
        render(<LocaleProvider><Page /></LocaleProvider>);

        const band = await screen.findByTestId('page-header');
        expect(screen.getAllByTestId('page-header')).toHaveLength(1);
        expect(within(band).getByRole('heading', { level: 1, name: title })).toHaveClass('text-display');
        expect(within(band).getByText(label)).toHaveClass('text-label');
        expect(label).not.toBe(title);
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(band.parentElement).not.toHaveClass('pt-step-8');
    });
});
