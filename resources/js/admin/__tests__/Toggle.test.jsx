import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import Toggle from '../components/Toggle.jsx';

describe('Toggle', () => {
    it('renders the ON state in green (regression check)', () => {
        render(<Toggle checked onChange={vi.fn()} label="Aktiv" />);

        const control = screen.getByRole('switch');
        expect(control).toHaveAttribute('aria-checked', 'true');
        expect(control.className).toContain('bg-green-600');
        expect(control.className).not.toContain('bg-neutral-900');
    });

    it('renders the OFF state in neutral gray, readable in dark mode', () => {
        render(<Toggle checked={false} onChange={vi.fn()} label="Aktiv" />);

        const control = screen.getByRole('switch');
        expect(control).toHaveAttribute('aria-checked', 'false');
        expect(control.className).toContain('bg-neutral-300');
        expect(control.className).toContain('dark:bg-neutral-700');
    });

    it('preserves switch semantics and click-to-toggle interaction', async () => {
        const onChange = vi.fn();
        render(<Toggle checked={false} onChange={onChange} label="Seçilmişlərdə göstər" />);

        expect(screen.getByText('Seçilmişlərdə göstər')).toBeInTheDocument();

        const control = screen.getByRole('switch');
        await userEvent.click(control);

        expect(onChange).toHaveBeenCalledWith(true);
    });
});
