import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import ExhibitionsPage from '../pages/ExhibitionsPage.jsx';

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

const exhibition = { slug: 'winter-show-2026', title: 'Winter Show 2026', status: 'current', start_date: '2026-01-10', end_date: '2026-02-10', venue: 'Main Gallery', media: [] };

describe('ExhibitionsPage', () => {
    it('renders exhibitions for the default (all active) filter', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [exhibition], meta: { current_page: 1, last_page: 1, total: 1 } }));

        render(<LocaleProvider><ExhibitionsPage /></LocaleProvider>);
        expect(await screen.findByText('Winter Show 2026')).toBeInTheDocument();
    });

    it('re-fetches with filter=archive when the Archive tab is clicked', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }));

        render(<LocaleProvider><ExhibitionsPage /></LocaleProvider>);
        await userEvent.click(screen.getByRole('button', { name: 'Arxiv' }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('filter=archive'), expect.anything());
        });
    });

    it('sets a static exhibitions document title', async () => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse({ data: [exhibition], meta: { current_page: 1, last_page: 1, total: 1 } }));

        render(<LocaleProvider><ExhibitionsPage /></LocaleProvider>);

        await waitFor(() => expect(document.title).toBe('Sərgilər — ArtNiyyətli'));
    });
});
