import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginScreen from '../screens/LoginScreen.jsx';

describe('LoginScreen', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    it('shows the server error message on invalid credentials', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 422,
            headers: { get: () => 'application/json' },
            json: async () => ({ message: 'Validation failed', errors: { username: ['These credentials do not match our records.'] } }),
        });

        render(<LoginScreen onLoggedIn={vi.fn()} />);

        await userEvent.type(screen.getByLabelText('İstifadəçi adı'), 'jane.admin');
        await userEvent.type(screen.getByLabelText('Şifrə'), 'wrong-password');
        await userEvent.click(screen.getByRole('button', { name: 'Daxil ol' }));

        await waitFor(() => {
            expect(screen.getByText('These credentials do not match our records.')).toBeInTheDocument();
        });
    });

    it('calls onLoggedIn with the dashboard payload after a successful login', async () => {
        const onLoggedIn = vi.fn();

        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: { get: () => 'application/json' },
                json: async () => ({ message: 'Authenticated.' }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: { get: () => 'application/json' },
                json: async () => ({ user: { id: 1, username: 'jane.admin', roles: ['administrator'] }, stats: {} }),
            });

        render(<LoginScreen onLoggedIn={onLoggedIn} />);

        await userEvent.type(screen.getByLabelText('İstifadəçi adı'), 'jane.admin');
        await userEvent.type(screen.getByLabelText('Şifrə'), 'correct-password');
        await userEvent.click(screen.getByRole('button', { name: 'Daxil ol' }));

        await waitFor(() => {
            expect(onLoggedIn).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ username: 'jane.admin' }) }));
        });
    });
});
