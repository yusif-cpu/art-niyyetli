import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import Pagination from '../components/Pagination.jsx';
import FilterBar from '../components/FilterBar.jsx';
import ErrorState from '../components/ErrorState.jsx';
import DetailWallView from '../components/DetailWallView.jsx';

// No outlined or filled buttons outside forms: toggles are text, the chosen one ink with a line under it.
const noBox = (el) => expect(el.className).not.toMatch(/(^|\s)border(\s|-line|-strong)|bg-/);

describe('plain controls (no boxes, no outlined buttons)', () => {
    it('filter options are text; the chosen one is ink with a line, the others keep a transparent line', () => {
        render(
            <LocaleProvider>
                <FilterBar filters={{ genre: 'p' }} onChange={() => {}} genres={[{ slug: 'p', name: 'Painting' }, { slug: 'd', name: 'Drawing' }]} />
            </LocaleProvider>
        );

        const chosen = screen.getByRole('button', { name: 'Painting' });
        const other = screen.getByRole('button', { name: 'Drawing' });
        [chosen, other].forEach(noBox);
        expect(chosen).toHaveClass('text-ink');
        expect(within(chosen).getByText('Painting')).toHaveClass('link-line');
        expect(within(chosen).getByText('Painting')).not.toHaveClass('border-transparent');
        expect(other).toHaveClass('text-ink-muted');
        // Not link-line: its border shorthand would beat border-transparent and draw the line anyway.
        expect(within(other).getByText('Drawing')).toHaveClass('border-b', 'border-transparent', 'pb-[3px]');
        expect(within(other).getByText('Drawing')).not.toHaveClass('link-line');
        // Form fields stay fields.
        expect(screen.getByRole('combobox')).toHaveClass('border', 'border-line-strong');
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

    it('the wall heights are text toggles', () => {
        render(<LocaleProvider><DetailWallView artwork={{ inventory_code: 'AN-1', width_cm: 100, height_cm: 80 }} /></LocaleProvider>);

        screen.getAllByRole('button').forEach(noBox);
        const pressed = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true');
        expect(pressed).toHaveLength(1);
        expect(pressed[0].querySelector('.link-line:not(.border-transparent)')).not.toBeNull();
        // Only the chosen height carries the line.
        expect(document.querySelectorAll('fieldset .link-line')).toHaveLength(1);
    });
});
