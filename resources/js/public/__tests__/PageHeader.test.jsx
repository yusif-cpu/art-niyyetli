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
    it('is a wine band: the 13px 600 label, the bold h1 with its *word*, the Spectral description, an aside on the right', () => {
        render(<PageHeader label="Təmsilçilik" title="Qalereyanın *rəssamları*" description="Qalereyanın rəssamları." aside={<p>8 əsər</p>} />);

        const band = screen.getByTestId('page-header');
        expect(band).toHaveClass('bg-wine', 'text-surface');
        expect(band).toHaveAttribute('data-surface', 'wine');
        expect(band.tagName).toBe('DIV'); // not a second banner landmark
        expect(band.firstElementChild).toHaveClass('md:grid-cols-[1.5fr_1fr]', 'pt-[clamp(56px,6.1vw,88px)]', 'pb-[clamp(56px,5.8vw,84px)]');
        expect(within(band).getByText('Təmsilçilik')).toHaveClass('text-[13px]', 'font-semibold', 'text-wine-muted');
        const h1 = within(band).getByRole('heading', { level: 1, name: 'Qalereyanın rəssamları' });
        expect(h1).toHaveClass('text-banner', 'text-surface');
        expect(within(h1).getByText('rəssamları').tagName).toBe('EM');
        expect(within(band).getByText('Qalereyanın rəssamları.')).toHaveClass('font-editorial', 'md:text-[20px]');
        expect(within(band).getByText('8 əsər')).toBeInTheDocument();
    });

    it('shows `meta` as a two-column grid of captions and values over a 1px line, leaving out empty values', () => {
        render(<PageHeader title="Bütün *əsərlər*" meta={[{ label: 'Əsər', value: '12' }, { label: 'Rəssam', value: '4' }, { label: 'Qiymət', value: null }]} />);

        const grid = screen.getByTestId('page-header-meta');
        expect(grid).toHaveClass('grid-cols-2', 'border-t', 'border-surface/20');
        expect([...grid.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(['Əsər', 'Rəssam']);
        expect(grid.querySelector('dd')).toHaveClass('text-[20px]', 'font-semibold', 'text-surface');
    });

    it('leaves the description out when there is none', () => {
        render(<PageHeader label="Təqvim" title="Sərgilər" />);

        expect(screen.getByTestId('page-header').querySelectorAll('p')).toHaveLength(1); // the label only
        expect(screen.getByTestId('page-header').firstElementChild.className).not.toMatch(/grid-cols-\[/); // one column without an aside
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
        ['catalogue', CataloguePage, 'Kolleksiya', 'Bütün əsərlər'],
        ['artists', ArtistsPage, 'Rəssamlar', 'Qalereyanın rəssamları'],
        ['exhibitions', ExhibitionsPage, 'Sərgilər', 'Cari və keçmiş sərgilər'],
        ['journal', ArticlesPage, 'Jurnal', 'Sənət, ölçü və kolleksiya'],
    ])('%s: one PageHeader band with its label over the h1, and no other h1', async (_name, Page, label, title) => {
        render(<LocaleProvider><Page /></LocaleProvider>);

        const band = await screen.findByTestId('page-header');
        expect(screen.getAllByTestId('page-header')).toHaveLength(1);
        expect(within(band).getByRole('heading', { level: 1, name: title })).toHaveClass('text-banner');
        expect(within(band).getByText(label)).toHaveClass('text-wine-muted');
        expect(label).not.toBe(title);
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(band.parentElement).not.toHaveClass('pt-step-8');
    });
});
