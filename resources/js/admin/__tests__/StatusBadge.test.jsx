import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBadge from '../components/StatusBadge.jsx';

describe('StatusBadge', () => {
    it('renders Aktiv in green when active', () => {
        render(<StatusBadge active />);

        const badge = screen.getByText('Aktiv');
        expect(badge.className).toContain('bg-green-100');
        expect(badge.className).toContain('dark:bg-green-950');
    });

    it('renders Deaktiv in red when inactive', () => {
        render(<StatusBadge active={false} />);

        const badge = screen.getByText('Deaktiv');
        expect(badge.className).toContain('bg-red-100');
        expect(badge.className).toContain('dark:bg-red-950');
    });

    it('supports custom labels', () => {
        render(<StatusBadge active={false} activeLabel="Göndərildi" inactiveLabel="Uğursuz" />);

        expect(screen.getByText('Uğursuz')).toBeInTheDocument();
    });
});
