import { render, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

describe('NotFoundPage', () => {
    it('sets a noindex robots meta tag and a generic title', async () => {
        render(<LocaleProvider><NotFoundPage /></LocaleProvider>);

        await waitFor(() => {
            expect(document.title).toBe('Səhifə tapılmadı — ArtNiyyətli');
            expect(document.querySelector('meta[name="robots"]').getAttribute('content')).toBe('noindex, follow');
        });
    });
});
