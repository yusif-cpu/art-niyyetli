import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import Pagination from '../components/Pagination.jsx';
import FilterBar from '../components/FilterBar.jsx';
import ErrorState from '../components/ErrorState.jsx';
import DetailWallView from '../components/DetailWallView.jsx';
import ArtworkCard from '../components/ArtworkCard.jsx';
import HomeWall from '../components/HomeWall.jsx';

// Text toggles stay text — the chosen one ink with a line under it. Krem-bordo boxes are deliberate and few: the
// genre chips, the wall-height choice and the buttons (lib/buttons.js).
const noBox = (el) => expect(el.className).not.toMatch(/(^|\s)border(\s|-line|-strong)|bg-/);

describe('plain controls', () => {
    it('genre chips are boxes (the chosen one wine); the options in a filter\'s panel stay text with a line', () => {
        render(
            <LocaleProvider>
                <FilterBar
                    filters={{ genre: 'p', medium: 'oil' }}
                    onChange={() => {}}
                    genres={[{ slug: 'p', name: 'Painting' }, { slug: 'd', name: 'Drawing' }]}
                    mediums={[{ slug: 'oil', name: 'Oil' }, { slug: 'ink', name: 'Ink' }]}
                />
            </LocaleProvider>
        );

        expect(screen.getByRole('button', { name: 'Painting' })).toHaveClass('bg-wine', 'text-surface', 'border-wine');
        expect(screen.getByRole('button', { name: 'Drawing' })).toHaveClass('border-line', 'text-ink');
        expect(screen.getByRole('button', { name: 'Drawing' }).className).not.toMatch(/bg-wine/);

        const chosen = screen.getByRole('button', { name: 'Oil' });
        const other = screen.getByRole('button', { name: 'Ink' });
        [chosen, other].forEach(noBox);
        expect(chosen).toHaveClass('text-ink');
        expect(within(chosen).getByText('Oil')).toHaveClass('link-line');
        expect(within(chosen).getByText('Oil')).not.toHaveClass('border-transparent');
        expect(other).toHaveClass('text-ink-muted');
        // Not link-line: its border shorthand would beat border-transparent and draw the line anyway.
        expect(within(other).getByText('Ink')).toHaveClass('border-b', 'border-transparent', 'pb-[3px]');
        expect(within(other).getByText('Ink')).not.toHaveClass('link-line');
        // The set filter's name is wine 600 in the strip.
        expect(screen.getByRole('button', { name: 'Texnika' })).toHaveClass('font-semibold', 'text-wine');
    });

    it('pagination is text; the current page carries the line', () => {
        render(<LocaleProvider><Pagination meta={{ current_page: 2, last_page: 3, total: 30 }} onPageChange={() => {}} /></LocaleProvider>);

        screen.getAllByRole('button').forEach(noBox);
        const current = screen.getByRole('button', { current: 'page' });
        expect(within(current).getByText('2')).toHaveClass('link-line');
        expect(within(current).getByText('2')).not.toHaveClass('border-transparent');
        // Exactly one line on the bar: the other pages carry no link-line.
        expect(screen.getByRole('navigation').querySelectorAll('.link-line')).toHaveLength(1);
    });

    it('the retry action is a text link, not a framed button', () => {
        render(<LocaleProvider><ErrorState error={{}} onRetry={() => {}} /></LocaleProvider>);

        const retry = screen.getByRole('button');
        noBox(retry);
        expect(retry).toHaveClass('min-h-11');
        expect(retry.querySelector('.link-line')).not.toBeNull();
    });

    it('draws artwork images without a frame; a work hung on a wall keeps its shadow', () => {
        const originalRO = global.ResizeObserver;
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 1000 } }]); }
            disconnect() {}
        };
        try {
            const work = { inventory_code: 'AN-1', title: 'A', artist: { id: 1, name: 'X' }, image_url: 'https://example.test/a.webp', width_cm: 100, height_cm: 80, price: 100, currency: 'AZN', availability: 'available' };
            render(
                <LocaleProvider>
                    <ArtworkCard artwork={work} k={2} />
                    <DetailWallView artwork={work} />
                    <HomeWall artworks={[work]} />
                </LocaleProvider>
            );

            const frame = /(^|\s)border(\s|-)/;
            expect(screen.getByTestId('artwork-field').className).not.toMatch(frame);
            expect(screen.getByTestId('wall-work').className).not.toMatch(frame);
            const hung = screen.getByTestId('wall-field');
            expect(hung.className).not.toMatch(frame);
            expect(hung).toHaveClass('shadow-hang');
        } finally {
            global.ResizeObserver = originalRO;
        }
    });

    it('the wall heights are one segmented choice on wine; only the chosen height is on cream', () => {
        render(<LocaleProvider><DetailWallView artwork={{ inventory_code: 'AN-1', width_cm: 100, height_cm: 80 }} /></LocaleProvider>);

        const buttons = screen.getAllByRole('button');
        expect(buttons.map((b) => b.textContent)).toEqual(['240 sm', '270 sm', '320 sm']);
        const pressed = buttons.filter((b) => b.getAttribute('aria-pressed') === 'true');
        expect(pressed).toHaveLength(1);
        expect(pressed[0]).toHaveClass('bg-surface', 'text-wine');
        buttons.filter((b) => b !== pressed[0]).forEach((b) => expect(b).toHaveClass('text-surface'));
        expect(buttons[0].parentElement).toHaveClass('border', 'border-surface/30');
    });
});
