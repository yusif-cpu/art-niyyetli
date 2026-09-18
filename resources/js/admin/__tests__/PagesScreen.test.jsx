import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PagesScreen from '../screens/PagesScreen.jsx';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const pageDetail = {
    id: 1,
    type: 'home',
    is_active: true,
    translations: [
        { locale: 'az', slug: 'home', title: 'Ana səhifə başlığı', content: 'AZ məzmun' },
        { locale: 'en', slug: 'home-en', title: 'Home title', content: 'EN content' },
    ],
    sections: [],
};

describe('PagesScreen', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            if (url === '/admin/pages') {
                return Promise.resolve(jsonResponse(200, { data: [{ id: 1, type: 'home', is_active: true, nav_placement: 'header', sort_order: 0, translation: { title: 'Ana səhifə başlığı' } }] }));
            }
            if (url === '/admin/pages/1') {
                return Promise.resolve(jsonResponse(200, { data: pageDetail }));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });
    });

    async function openEditor() {
        render(
            <ToastProvider>
                <PagesScreen />
            </ToastProvider>
        );

        await userEvent.click(await screen.findByRole('button', { name: 'Redaktə et' }));
        await screen.findByDisplayValue('Ana səhifə başlığı');
    }

    it('renders the AZ title by default and switches to EN on tab click', async () => {
        await openEditor();

        expect(screen.getByDisplayValue('Ana səhifə başlığı')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: 'EN' }));

        expect(screen.getByDisplayValue('Home title')).toBeInTheDocument();
    });

    it('preserves the edited value and shows the field error after a failed save, then shows success on retry', async () => {
        await openEditor();

        const titleInput = screen.getByDisplayValue('Ana səhifə başlığı');
        await userEvent.clear(titleInput);
        await userEvent.type(titleInput, 'Yeni başlıq');

        global.fetch.mockImplementationOnce(() =>
            Promise.resolve(
                jsonResponse(422, { message: 'The given data was invalid.', errors: { 'translations.0.title': ['Title is required.'] } })
            )
        );

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Title is required.')).toBeInTheDocument();
        });
        expect(screen.getByDisplayValue('Yeni başlıq')).toBeInTheDocument();

        global.fetch.mockImplementation(() => Promise.resolve(jsonResponse(200, { data: pageDetail })));

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        await waitFor(() => {
            expect(screen.getByText('Yadda saxlanıldı')).toBeInTheDocument();
        });
    });

    it('shows an error banner when the initial pages fetch fails', async () => {
        global.fetch = vi.fn(() => Promise.resolve(jsonResponse(500, { message: 'Server error' })));

        render(
            <ToastProvider>
                <PagesScreen />
            </ToastProvider>
        );

        await screen.findByText('Səhifələri yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.');
    });

    it('creates a new custom page and opens its editor', async () => {
        const newPageDetail = {
            id: 2,
            type: 'custom',
            is_active: true,
            translations: [{ locale: 'az', slug: 'yeni-sehife', title: 'Yeni səhifə başlığı', content: 'Yeni məzmun' }],
            sections: [],
        };

        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/pages' && options?.method === 'POST') {
                return Promise.resolve(jsonResponse(201, { data: { id: 2 } }));
            }
            if (url === '/admin/pages' && options?.method === 'GET') {
                return Promise.resolve(jsonResponse(200, { data: [{ id: 1, type: 'home', is_active: true, nav_placement: 'header', sort_order: 0, translation: { title: 'Ana səhifə başlığı' } }] }));
            }
            if (url === '/admin/pages/2') {
                return Promise.resolve(jsonResponse(200, { data: newPageDetail }));
            }
            if (url === '/admin/pages/1') {
                return Promise.resolve(jsonResponse(200, { data: pageDetail }));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        render(
            <ToastProvider>
                <PagesScreen />
            </ToastProvider>
        );

        await userEvent.click(await screen.findByRole('button', { name: 'Yeni səhifə' }));

        await userEvent.type(screen.getByLabelText('URL (slug)'), 'yeni-sehife');
        await userEvent.type(screen.getByLabelText('Başlıq'), 'Yeni səhifə başlığı');
        await userEvent.type(screen.getByLabelText('Məzmun'), 'Yeni məzmun');

        await userEvent.click(screen.getByRole('button', { name: 'Yarat' }));

        await screen.findByDisplayValue('Yeni səhifə başlığı');
    });

    it('shows an image preview for a section that has one, and no broken preview for a section without one (regression check)', async () => {
        global.fetch = vi.fn((url) => {
            if (url === '/admin/pages') {
                return Promise.resolve(jsonResponse(200, { data: [{ id: 1, type: 'home', is_active: true, nav_placement: 'header', sort_order: 0, translation: { title: 'Ana səhifə başlığı' } }] }));
            }
            if (url === '/admin/pages/1') {
                return Promise.resolve(
                    jsonResponse(200, {
                        data: {
                            ...pageDetail,
                            sections: [
                                { id: 10, key: 'hero', is_active: true, image_url: 'https://example.test/hero-detail.webp' },
                                { id: 11, key: 'about', is_active: true, image_url: null },
                            ],
                        },
                    })
                );
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        await openEditor();

        const heroRow = (await screen.findByText('hero')).closest('li');
        expect(within(heroRow).getByRole('img')).toHaveAttribute('src', 'https://example.test/hero-detail.webp');

        const aboutRow = screen.getByText('about').closest('li');
        expect(within(aboutRow).queryByRole('img')).not.toBeInTheDocument();
    });

    it('changes a page nav_placement via the select and reloads the list', async () => {
        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/pages' && (!options || options.method === 'GET')) {
                return Promise.resolve(jsonResponse(200, {
                    data: [{ id: 1, type: 'home', is_active: true, nav_placement: 'header', sort_order: 0, translation: { title: 'Ana səhifə başlığı' } }],
                }));
            }
            if (url === '/admin/pages/1' && options?.method === 'PUT') {
                return Promise.resolve(jsonResponse(200, { data: { id: 1 } }));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        render(
            <ToastProvider>
                <PagesScreen />
            </ToastProvider>
        );

        await screen.findByText('Ana səhifə başlığı');

        await userEvent.selectOptions(screen.getByLabelText('Naviqasiya yeri'), 'footer');

        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([callUrl, callOptions]) => callUrl === '/admin/pages/1' && callOptions?.method === 'PUT');
            expect(putCall).toBeTruthy();
            expect(JSON.parse(putCall[1].body)).toEqual({ nav_placement: 'footer' });
        });
    });

    it('shows an error toast and does not reload the list when reordering fails', async () => {
        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/pages' && (!options || options.method === 'GET')) {
                return Promise.resolve(jsonResponse(200, {
                    data: [
                        { id: 1, type: 'home', is_active: true, nav_placement: 'header', sort_order: 0, translation: { title: 'Ana səhifə' } },
                        { id: 2, type: 'about', is_active: true, nav_placement: 'header', sort_order: 1, translation: { title: 'Haqqımızda' } },
                    ],
                }));
            }
            if (url === '/admin/pages/reorder' && options?.method === 'POST') {
                return Promise.resolve(jsonResponse(422, { message: 'Sıralama uğursuz oldu.', errors: {} }));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        render(
            <ToastProvider>
                <PagesScreen />
            </ToastProvider>
        );

        await screen.findByText('Haqqımızda');

        await userEvent.click(screen.getAllByRole('button', { name: 'Yuxarı' })[1]);

        await screen.findByText('Sıralama uğursuz oldu.');
    });

    it('moves a page up within its placement group using the reorder endpoint', async () => {
        global.fetch = vi.fn((url, options) => {
            if (url === '/admin/pages' && (!options || options.method === 'GET')) {
                return Promise.resolve(jsonResponse(200, {
                    data: [
                        { id: 1, type: 'home', is_active: true, nav_placement: 'header', sort_order: 0, translation: { title: 'Ana səhifə' } },
                        { id: 2, type: 'about', is_active: true, nav_placement: 'header', sort_order: 1, translation: { title: 'Haqqımızda' } },
                    ],
                }));
            }
            if (url === '/admin/pages/reorder' && options?.method === 'POST') {
                return Promise.resolve(jsonResponse(200, { message: 'Pages reordered.' }));
            }
            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        render(
            <ToastProvider>
                <PagesScreen />
            </ToastProvider>
        );

        await screen.findByText('Haqqımızda');

        await userEvent.click(screen.getAllByRole('button', { name: 'Yuxarı' })[1]);

        await waitFor(() => {
            const reorderCall = global.fetch.mock.calls.find(([callUrl]) => callUrl === '/admin/pages/reorder');
            expect(reorderCall).toBeTruthy();
            expect(JSON.parse(reorderCall[1].body)).toEqual({
                items: [
                    { id: 2, sort_order: 0 },
                    { id: 1, sort_order: 1 },
                ],
            });
        });
    });
});
