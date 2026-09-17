import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import ArticlesScreen from '../screens/ArticlesScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const articleListItem = {
    id: 11,
    translation: { title: 'Sənət Müsahibəsi' },
    type: 'interview',
    status: 'draft',
};

const articleDetail = {
    id: 11,
    type: 'interview',
    status: 'draft',
    published_at: null,
    is_active: true,
    media: [],
    translations: [
        { locale: 'az', slug: 'senet-musahibesi', title: 'Sənət Müsahibəsi', short_text: '', content: '' },
        { locale: 'en', slug: 'art-interview', title: 'Art Interview', short_text: '', content: '' },
    ],
};

function setupFetch({ articles = [articleListItem] } = {}) {
    global.fetch = vi.fn((url, options) => {
        const method = options?.method || 'GET';

        if (url.startsWith('/admin/articles?') && method === 'GET') {
            return Promise.resolve(jsonResponse(200, { data: articles, meta: { current_page: 1, last_page: 1, total: articles.length } }));
        }
        if (url === '/admin/articles/11' && method === 'GET') {
            return Promise.resolve(jsonResponse(200, { data: articleDetail }));
        }
        if (url === '/admin/articles/11' && method === 'PUT') {
            return Promise.resolve(jsonResponse(200, { data: articleDetail }));
        }

        return Promise.resolve(jsonResponse(200, { data: {} }));
    });
}

async function openEditor() {
    render(
        <ToastProvider>
            <ArticlesScreen />
        </ToastProvider>
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Redaktə et' }));
    await screen.findByDisplayValue('Sənət Müsahibəsi');
}

describe('ArticlesScreen', () => {
    it('renders the article list from the backend', async () => {
        setupFetch();

        render(
            <ToastProvider>
                <ArticlesScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('Sənət Müsahibəsi')).toBeInTheDocument();
    });

    it('shows the empty state when there are no articles', async () => {
        setupFetch({ articles: [] });

        render(
            <ToastProvider>
                <ArticlesScreen />
            </ToastProvider>
        );

        expect(await screen.findByText('Hələ heç bir məqalə əlavə edilməyib')).toBeInTheDocument();
    });

    it('shows the field error after a failed save, then shows success on retry', async () => {
        setupFetch();
        await openEditor();

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(jsonResponse(422, { message: 'The given data was invalid.', errors: { published_at: ['Published date cannot be in the future.'] } }))
        );

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Published date cannot be in the future.')).toBeInTheDocument();
        });

        global.fetch.mockImplementation(() => Promise.resolve(jsonResponse(200, { data: articleDetail })));

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Dəyişikliklər yadda saxlanıldı')).toBeInTheDocument();
        });
    });

    it('shows the specific validation message for a translation field error, not a generic banner', async () => {
        setupFetch();
        await openEditor();

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(jsonResponse(422, {
                message: 'The translations.0.slug field is required.',
                errors: { 'translations.0.slug': ['The translations.0.slug field is required.'] },
            }))
        );

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('The translations.0.slug field is required.')).toBeInTheDocument();
        });
        expect(screen.queryByText('Məlumatları yadda saxlamaq mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.')).not.toBeInTheDocument();
    });
});
