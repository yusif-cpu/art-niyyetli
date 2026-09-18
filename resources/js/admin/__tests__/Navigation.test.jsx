import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import AdminShell from '../layout/AdminShell.jsx';
import { useHashRoute } from '../lib/useHashRoute.js';
import { ThemeProvider } from '../components/ThemeContext.jsx';

function Harness() {
    const [route, navigate] = useHashRoute();

    return (
        <ThemeProvider>
            <AdminShell user={{ username: 'jane.admin', roles: ['administrator'] }} current={route} onNavigate={navigate} onLogout={() => {}}>
                <p>Current screen: {route}</p>
            </AdminShell>
        </ThemeProvider>
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

    it('shows a Rəssamlar nav item and navigates to the artists screen (regression check)', async () => {
        render(<Harness />);

        await userEvent.click(screen.getByRole('button', { name: 'Rəssamlar' }));

        expect(screen.getByText('Current screen: artists')).toBeInTheDocument();
        expect(window.location.hash).toBe('#artists');
    });

    it('hides the Users nav item for non-administrators', () => {
        render(
            <ThemeProvider>
                <AdminShell user={{ username: 'ed.editor', roles: ['editor'] }} current="dashboard" onNavigate={() => {}} onLogout={() => {}}>
                    <p>content</p>
                </AdminShell>
            </ThemeProvider>
        );

        expect(screen.queryByRole('button', { name: 'İstifadəçilər' })).not.toBeInTheDocument();
    });

    it('renders the unread-enquiries badge next to the Sorğular nav item (regression check)', () => {
        render(
            <ThemeProvider>
                <AdminShell
                    user={{ username: 'jane.admin', roles: ['administrator'] }}
                    current="dashboard"
                    onNavigate={() => {}}
                    onLogout={() => {}}
                    badges={{ enquiries: 3 }}
                >
                    <p>content</p>
                </AdminShell>
            </ThemeProvider>
        );

        const enquiriesButton = screen.getByRole('button', { name: /Sorğular/ });
        expect(within(enquiriesButton).getByText('3')).toBeInTheDocument();
    });
});

describe('Screen routing completeness', () => {
    const IMPLEMENTED_MODULES = [
        'dashboard',
        'pages',
        'navigation',
        'faqs',
        'settings',
        'social-links',
        'enquiries',
        'artworks',
        'artists',
        'exhibitions',
        'articles',
        'media',
        'users',
    ];

    it('does not leave PlaceholderScreen wired up in the SCREENS map for any implemented module', () => {
        const appSource = readFileSync(path.resolve(process.cwd(), 'resources/js/admin/App.jsx'), 'utf-8');

        const screensBlockMatch = appSource.match(/const SCREENS = \{([\s\S]*?)\n\};/);
        expect(screensBlockMatch, 'Could not find the SCREENS map in App.jsx').not.toBeNull();

        const screensBlock = screensBlockMatch[1];

        IMPLEMENTED_MODULES.forEach((key) => {
            const keyPattern = new RegExp(`(?:'${key}'|"${key}"|\\b${key}\\b)\\s*:\\s*(\\w+)`);
            const match = screensBlock.match(keyPattern);

            expect(match, `SCREENS is missing a mapping for "${key}"`).not.toBeNull();
            expect(match[1], `SCREENS["${key}"] should not be PlaceholderScreen`).not.toBe('PlaceholderScreen');
        });
    });
});
