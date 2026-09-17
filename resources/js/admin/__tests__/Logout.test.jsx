import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AdminShell from '../layout/AdminShell.jsx';
import { ThemeProvider } from '../components/ThemeContext.jsx';

describe('Logout', () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => 'application/json' },
            json: async () => ({ message: 'Logged out.' }),
        });
    });

    it('calls POST /admin/logout and fires onLogout when clicked', async () => {
        const onLogout = vi.fn(async () => {
            await fetch('/admin/logout', { method: 'POST' });
        });

        render(
            <ThemeProvider>
                <AdminShell user={{ username: 'jane.admin', roles: ['administrator'] }} current="dashboard" onNavigate={() => {}} onLogout={onLogout}>
                    <p>content</p>
                </AdminShell>
            </ThemeProvider>
        );

        await userEvent.click(screen.getByRole('button', { name: 'Çıxış' }));

        await waitFor(() => {
            expect(onLogout).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith('/admin/logout', expect.objectContaining({ method: 'POST' }));
        });
    });
});
