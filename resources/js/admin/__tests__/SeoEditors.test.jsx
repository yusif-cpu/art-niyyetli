import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import PageEditorScreen from '../screens/PageEditorScreen.jsx';
import ArtworkEditorScreen from '../screens/ArtworkEditorScreen.jsx';
import ArtistEditorScreen from '../screens/ArtistEditorScreen.jsx';
import ExhibitionEditorScreen from '../screens/ExhibitionEditorScreen.jsx';
import ArticleEditorScreen from '../screens/ArticleEditorScreen.jsx';
import SeoFields from '../components/SeoFields.jsx';
import { seoToState, seoToPayload } from '../lib/seo.js';
import { ToastProvider } from '../components/ToastContext.jsx';

function jsonResponse(status, data) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => data };
}

const seoRows = [
    { locale: 'az', title: 'AZ SEO başlıq', description: 'AZ təsvir', og_image_id: 7, og_image_url: 'https://example.test/og.webp' },
    { locale: 'en', title: 'EN SEO title', description: null, og_image_id: null, og_image_url: null },
];
const tr = (extra) => [
    { locale: 'az', slug: 'az-slug', ...extra },
    { locale: 'en', slug: 'en-slug', ...extra },
];

// One entry per editor: how to render it, the resource path and a minimal admin payload.
const EDITORS = {
    page: {
        render: () => <PageEditorScreen pageId={1} onBack={() => {}} />,
        path: '/admin/pages/1',
        data: { id: 1, type: 'custom', is_active: true, translations: tr({ title: 'Başlıq', content: 'Məzmun' }), sections: [] },
    },
    artwork: {
        render: () => <ArtworkEditorScreen artworkId={1} onBack={() => {}} />,
        path: '/admin/artworks/1',
        data: {
            id: 1, artist: { id: 1 }, medium: { id: 1 }, genre: { id: 1 }, year_created: 2023, width_cm: 1, height_cm: 1, price: 1, show_price: true,
            availability: 'available', inventory_code: 'AN-1', certificate: false, featured: false, show_on_wall: false, sort_order: 0, is_active: true,
            images: [], translations: tr({ title: 'Əsər', short_description: 'S', provenance: 'P' }),
        },
    },
    artist: {
        render: () => <ArtistEditorScreen artistId={1} onBack={() => {}} />,
        path: '/admin/artists/1',
        data: { id: 1, sort_order: 0, is_active: true, representation_image_id: null, exhibitions: [], awards: [], translations: tr({ first_name: 'A', last_name: 'B' }) },
    },
    exhibition: {
        render: () => <ExhibitionEditorScreen exhibitionId={1} onBack={() => {}} />,
        path: '/admin/exhibitions/1',
        data: {
            id: 1, type: 'exhibition', status: 'upcoming', start_date: '2026-01-01', end_date: '2026-02-01', is_active: true, artists: [], artworks: [], media: [],
            translations: tr({ title: 'Sərgi', venue: 'V', short_text: 'S', full_text: 'F' }),
        },
    },
    article: {
        render: () => <ArticleEditorScreen articleId={1} onBack={() => {}} />,
        path: '/admin/articles/1',
        data: { id: 1, type: 'news', status: 'draft', published_at: null, is_active: true, media: [], translations: tr({ title: 'Məqalə', short_text: 'S', content: 'C' }) },
    },
};

function setup({ path, data }, seo) {
    global.fetch = vi.fn((url, options) => {
        const method = options?.method || 'GET';
        if (url === path && method === 'GET') return Promise.resolve(jsonResponse(200, { data: { ...data, seo } }));
        if (url === path && method === 'PUT') return Promise.resolve(jsonResponse(200, { data: { ...data, seo } }));

        return Promise.resolve(jsonResponse(200, { data: [] }));
    });
}

function putBody(path) {
    const call = global.fetch.mock.calls.find(([url, options]) => url === path && options?.method === 'PUT');

    return call ? JSON.parse(call[1].body) : null;
}

async function save() {
    await userEvent.click(screen.getAllByRole('button', { name: 'Yadda saxla' })[0]);
}

describe.each(Object.entries(EDITORS))('%s editor SEO fields', (_name, editor) => {
    it('shows the stored AZ override and lets the EN one be viewed', async () => {
        setup(editor, seoRows);
        render(<ToastProvider>{editor.render()}</ToastProvider>);

        expect(await screen.findByText('SEO (AZ / EN)')).toBeInTheDocument();
        expect(screen.getByLabelText('SEO başlığı')).toHaveValue('AZ SEO başlıq');
        expect(screen.getByLabelText(/SEO təsviri/)).toHaveValue('AZ təsvir');
        expect(screen.getByAltText('Seçilmiş şəkil')).toHaveAttribute('src', 'https://example.test/og.webp');

        const sections = screen.getByText('SEO (AZ / EN)').closest('section');
        await userEvent.click(sections.querySelector('[role="tab"][aria-selected="false"]'));
        expect(screen.getByLabelText('SEO başlığı')).toHaveValue('EN SEO title');
    });

    it('sends the edited override for both locales on save, keeping the image', async () => {
        setup(editor, seoRows);
        render(<ToastProvider>{editor.render()}</ToastProvider>);
        await screen.findByText('SEO (AZ / EN)');

        await userEvent.clear(screen.getByLabelText('SEO başlığı'));
        await userEvent.type(screen.getByLabelText('SEO başlığı'), 'Yeni başlıq');
        await save();

        await waitFor(() => expect(putBody(editor.path)).not.toBeNull());
        expect(putBody(editor.path).seo).toEqual([
            { locale: 'az', title: 'Yeni başlıq', description: 'AZ təsvir', og_image_id: 7 },
            { locale: 'en', title: 'EN SEO title', description: null, og_image_id: null },
        ]);
    });

    it('sends all-null entries to clear an override when the fields are emptied', async () => {
        setup(editor, [{ locale: 'az', title: 'Yalnız başlıq', description: null, og_image_id: null, og_image_url: null }]);
        render(<ToastProvider>{editor.render()}</ToastProvider>);
        await screen.findByText('SEO (AZ / EN)');

        await userEvent.clear(screen.getByLabelText('SEO başlığı'));
        await save();

        await waitFor(() => expect(putBody(editor.path)).not.toBeNull());
        expect(putBody(editor.path).seo).toEqual([
            { locale: 'az', title: null, description: null, og_image_id: null },
            { locale: 'en', title: null, description: null, og_image_id: null },
        ]);
    });
});

describe('SeoFields', () => {
    it('shows server validation errors for the entry of the active locale', () => {
        render(
            <SeoFields
                value={seoToState(null)}
                onChange={() => {}}
                errors={{ 'seo.0.title': ['Too long.'], 'seo.0.description': ['Also too long.'], 'seo.0.og_image_id': ['Not an image.'] }}
            />
        );

        expect(screen.getByText('Too long.')).toBeInTheDocument();
        expect(screen.getByText('Also too long.')).toBeInTheDocument();
        expect(screen.getByText('Not an image.')).toBeInTheDocument();
    });

    it('starts empty with both locales for a record that has no SEO', () => {
        expect(seoToPayload(seoToState(undefined))).toEqual([
            { locale: 'az', title: null, description: null, og_image_id: null },
            { locale: 'en', title: null, description: null, og_image_id: null },
        ]);
    });
});
