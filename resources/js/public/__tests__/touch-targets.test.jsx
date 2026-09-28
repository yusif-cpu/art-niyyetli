import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import Pagination from '../components/Pagination.jsx';
import FilterBar from '../components/FilterBar.jsx';
import SocialLinks from '../components/SocialLinks.jsx';

// jsdom has no layout: these check the classes that give each control its 44 × 44px touch area (min-h-11 = 44px).
describe('touch targets (44 × 44px)', () => {
    it('pagination buttons', () => {
        render(<LocaleProvider><Pagination meta={{ current_page: 2, last_page: 5, total: 50 }} onPageChange={() => {}} /></LocaleProvider>);

        screen.getAllByRole('button').forEach((button) => expect(button).toHaveClass('min-h-11', 'min-w-11'));
    });

    it('filter options and fields', () => {
        render(
            <LocaleProvider>
                <FilterBar filters={{}} onChange={() => {}} genres={[{ slug: 'p', name: 'Painting' }]} mediums={[]} artists={[]} />
            </LocaleProvider>
        );

        expect(screen.getByRole('button', { name: 'Painting' })).toHaveClass('min-h-11');
        screen.getAllByRole('spinbutton').forEach((field) => expect(field).toHaveClass('min-h-11'));
        expect(screen.getByRole('combobox')).toHaveClass('min-h-11');
    });

    it('social links', () => {
        render(<SocialLinks links={[{ platform: 'Instagram', url: 'https://instagram.com/a', display_mode: 'text_only', logo_url: null }]} />);

        expect(screen.getByRole('link', { name: 'Instagram' })).toHaveClass('min-h-11', 'min-w-11');
    });
});
