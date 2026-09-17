import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import Pagination from '../components/Pagination.jsx';

function withLocale(ui) {
    return <LocaleProvider>{ui}</LocaleProvider>;
}

describe('Pagination', () => {
    it('renders nothing when meta is null', () => {
        const { container } = render(withLocale(<Pagination meta={null} onPageChange={vi.fn()} />));
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when there is only one page', () => {
        const { container } = render(withLocale(<Pagination meta={{ current_page: 1, last_page: 1, total: 3 }} onPageChange={vi.fn()} />));
        expect(container).toBeEmptyDOMElement();
    });

    it('disables Previous on the first page and Next on the last page', () => {
        const { rerender } = render(withLocale(<Pagination meta={{ current_page: 1, last_page: 3, total: 61 }} onPageChange={vi.fn()} />));
        expect(screen.getByRole('button', { name: 'Əvvəlki' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Növbəti' })).not.toBeDisabled();

        rerender(withLocale(<Pagination meta={{ current_page: 3, last_page: 3, total: 61 }} onPageChange={vi.fn()} />));
        expect(screen.getByRole('button', { name: 'Əvvəlki' })).not.toBeDisabled();
        expect(screen.getByRole('button', { name: 'Növbəti' })).toBeDisabled();
    });

    it('calls onPageChange with the next/previous page number', async () => {
        const onPageChange = vi.fn();
        render(withLocale(<Pagination meta={{ current_page: 2, last_page: 3, total: 61 }} onPageChange={onPageChange} />));

        await userEvent.click(screen.getByRole('button', { name: 'Növbəti' }));
        expect(onPageChange).toHaveBeenCalledWith(3);

        await userEvent.click(screen.getByRole('button', { name: 'Əvvəlki' }));
        expect(onPageChange).toHaveBeenCalledWith(1);
    });
});
