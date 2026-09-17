import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import LoadingState from '../components/LoadingState.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import ImageWithFallback from '../components/ImageWithFallback.jsx';
import { PublicApiError } from '../lib/api.js';

function withLocale(ui) {
    return <LocaleProvider>{ui}</LocaleProvider>;
}

describe('LoadingState', () => {
    it('renders the localized loading message', () => {
        render(withLocale(<LoadingState />));
        expect(screen.getByText('Yüklənir...')).toBeInTheDocument();
    });
});

describe('EmptyState', () => {
    it('renders a custom message when given', () => {
        render(withLocale(<EmptyState message="Sifarişlər yoxdur." />));
        expect(screen.getByText('Sifarişlər yoxdur.')).toBeInTheDocument();
    });

    it('renders the default localized message otherwise', () => {
        render(withLocale(<EmptyState />));
        expect(screen.getByText('Heç nə tapılmadı.')).toBeInTheDocument();
    });
});

describe('ErrorState', () => {
    it('renders the rate-limit message for a rate-limited error', () => {
        render(withLocale(<ErrorState error={new PublicApiError(429, 'Too Many Attempts.')} />));
        expect(screen.getByText('Həddindən çox sorğu göndərildi. Zəhmət olmasa bir az sonra yenidən cəhd edin.')).toBeInTheDocument();
    });

    it('renders the generic error message for a non-rate-limit error', () => {
        render(withLocale(<ErrorState error={new PublicApiError(500, 'Server error.')} />));
        expect(screen.getByText('Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.')).toBeInTheDocument();
    });

    it('calls onRetry when the retry button is clicked, and omits it when not passed', async () => {
        const onRetry = vi.fn();
        render(withLocale(<ErrorState error={new PublicApiError(500, 'x')} onRetry={onRetry} />));
        await userEvent.click(screen.getByRole('button', { name: 'Yenidən cəhd et' }));
        expect(onRetry).toHaveBeenCalled();

        render(withLocale(<ErrorState error={new PublicApiError(500, 'x')} />));
        expect(screen.queryAllByRole('button', { name: 'Yenidən cəhd et' })).toHaveLength(1); // only the one from the previous render
    });
});

describe('ImageWithFallback', () => {
    it('renders an img when src is provided', () => {
        render(<ImageWithFallback src="https://example.test/a.webp" alt="Test" />);
        expect(screen.getByRole('img', { name: 'Test' })).toHaveAttribute('src', 'https://example.test/a.webp');
    });

    it('renders a placeholder, not a broken img, when src is null', () => {
        render(<ImageWithFallback src={null} alt="Test" />);
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
