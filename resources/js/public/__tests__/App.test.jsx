import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App.jsx';

describe('App routing', () => {
    beforeEach(() => {
        window.history.pushState(null, '', '/');
    });

    it('renders the site shell nav and a placeholder page for the home route', () => {
        render(<App />);
        expect(screen.getByRole('link', { name: 'Əsərlər' })).toBeInTheDocument();
    });

    it('renders NotFoundPage for an unmatched route', () => {
        window.history.pushState(null, '', '/a/b/c');
        render(<App />);
        expect(screen.getByText('Səhifə tapılmadı')).toBeInTheDocument();
    });
});
