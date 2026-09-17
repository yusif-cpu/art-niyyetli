import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import UsersScreen from '../screens/UsersScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const usersData = {
    users: [
        { id: 1, name: 'Aidan Musayev', username: 'aidan.admin', email: 'aidan@example.com', is_active: true, roles: ['administrator'] },
        { id: 2, name: 'Nigar Həsənova', username: 'nigar.editor', email: 'nigar@example.com', is_active: false, roles: ['editor'] },
    ],
};

describe('UsersScreen', () => {
    it('renders the read-only user list with role badges and is_active status', async () => {
        global.fetch = vi.fn(() => Promise.resolve(jsonResponse(200, usersData)));

        render(
            <ToastProvider>
                <UsersScreen />
            </ToastProvider>
        );

        const aidanRow = (await screen.findByText('Aidan Musayev')).closest('li');
        expect(within(aidanRow).getByText('@aidan.admin')).toBeInTheDocument();
        expect(within(aidanRow).getByText('Administrator')).toBeInTheDocument();
        expect(within(aidanRow).getByText('Aktiv')).toBeInTheDocument();

        const nigarRow = screen.getByText('Nigar Həsənova').closest('li');
        expect(within(nigarRow).getByText('@nigar.editor')).toBeInTheDocument();
        expect(within(nigarRow).getByText('Redaktor')).toBeInTheDocument();
        expect(within(nigarRow).getByText('Deaktiv')).toBeInTheDocument();
    });

    it('shows an error message when the user list fails to load', async () => {
        global.fetch = vi.fn(() => Promise.resolve(jsonResponse(500, { message: 'Server error.' })));

        render(
            <ToastProvider>
                <UsersScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('İstifadəçiləri yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.')).toBeInTheDocument();
    });

    it('creates a new user and shows it in the refetched list', async () => {
        const newUser = {
            id: 3,
            name: 'Kamran Vəliyev',
            username: 'kamran.editor',
            email: 'kamran@example.com',
            is_active: true,
            roles: ['editor'],
        };
        let listCallCount = 0;

        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/users' && options?.method === 'GET') {
                listCallCount += 1;
                if (listCallCount === 1) {
                    return Promise.resolve(jsonResponse(200, usersData));
                }
                return Promise.resolve(jsonResponse(200, { users: [...usersData.users, newUser] }));
            }
            if (url === '/admin/users' && options?.method === 'POST') {
                return Promise.resolve(jsonResponse(201, { data: newUser }));
            }
            return Promise.resolve(jsonResponse(200, {}));
        });

        render(
            <ToastProvider>
                <UsersScreen />
            </ToastProvider>
        );

        await screen.findByText('Aidan Musayev');
        await userEvent.click(screen.getByRole('button', { name: 'Yeni istifadəçi' }));

        await userEvent.type(screen.getByLabelText('Ad'), newUser.name);
        await userEvent.type(screen.getByLabelText('İstifadəçi adı'), newUser.username);
        await userEvent.type(screen.getByLabelText('E-poçt'), newUser.email);
        await userEvent.type(screen.getByLabelText('Şifrə'), 'password123');

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        expect(await screen.findByText('Kamran Vəliyev')).toBeInTheDocument();
    });

    it('shows the real backend message when deleting the last active administrator is blocked (409)', async () => {
        const guardMessage = 'Son aktiv administrator hesabı silinə və ya deaktiv edilə bilməz.';

        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/users' && options?.method === 'GET') {
                return Promise.resolve(jsonResponse(200, usersData));
            }
            if (url === '/admin/users/1' && options?.method === 'DELETE') {
                return Promise.resolve(jsonResponse(409, { message: guardMessage }));
            }
            return Promise.resolve(jsonResponse(200, {}));
        });

        render(
            <ToastProvider>
                <UsersScreen />
            </ToastProvider>
        );

        const aidanRow = (await screen.findByText('Aidan Musayev')).closest('li');
        await userEvent.click(within(aidanRow).getByRole('button', { name: 'Sil' }));

        await userEvent.click(screen.getByRole('button', { name: 'Təsdiqlə' }));

        expect(await screen.findByText(guardMessage)).toBeInTheDocument();
    });

    it('editing a user without touching the password field omits it from the submitted payload', async () => {
        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/users' && options?.method === 'GET') {
                return Promise.resolve(jsonResponse(200, usersData));
            }
            if (url === '/admin/users/1' && options?.method === 'PUT') {
                return Promise.resolve(jsonResponse(200, { data: usersData.users[0] }));
            }
            return Promise.resolve(jsonResponse(200, {}));
        });

        render(
            <ToastProvider>
                <UsersScreen />
            </ToastProvider>
        );

        const aidanRow = (await screen.findByText('Aidan Musayev')).closest('li');
        await userEvent.click(within(aidanRow).getByRole('button', { name: 'Redaktə et' }));

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([url, options]) => url === '/admin/users/1' && options?.method === 'PUT');
            expect(putCall).toBeTruthy();
            const body = JSON.parse(putCall[1].body);
            expect(body).not.toHaveProperty('password');
        });
    });
});
