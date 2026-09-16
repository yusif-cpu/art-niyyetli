import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import AdminShell from '../layout/AdminShell.jsx';
import { useHashRoute } from '../lib/useHashRoute.js';

function Harness() {
    const [route, navigate] = useHashRoute();

    return (
        <AdminShell user={{ username: 'jane.admin', roles: ['administrator'] }} current={route} onNavigate={navigate} onLogout={() => {}}>
            <p>Current screen: {route}</p>
        </AdminShell>
    );
}

describe('Sidebar navigation', () => {
    beforeEach(() => {
        window.location.hash = '';
    });

    it('defaults to the dashboard screen', () => {
        render(<Harness />);

        expect(screen.getByText('Current screen: dashboard')).toBeInTheDocument();
    });

    it('switches screens and updates the hash when a sidebar item is clicked', async () => {
        render(<Harness />);

        await userEvent.click(screen.getByRole('button', { name: 'Səhifələr' }));

        expect(screen.getByText('Current screen: pages')).toBeInTheDocument();
        expect(window.location.hash).toBe('#pages');
    });

    it('hides the Users nav item for non-administrators', () => {
        render(
            <AdminShell user={{ username: 'ed.editor', roles: ['editor'] }} current="dashboard" onNavigate={() => {}} onLogout={() => {}}>
                <p>content</p>
            </AdminShell>
        );

        expect(screen.queryByRole('button', { name: 'İstifadəçilər' })).not.toBeInTheDocument();
    });
});
