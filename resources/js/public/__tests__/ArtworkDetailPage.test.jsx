import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import { SiteDataProvider } from '../layout/SiteDataContext.jsx';
import LocaleSwitcher from '../components/LocaleSwitcher.jsx';
import ArtworkDetailPage from '../pages/ArtworkDetailPage.jsx';

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json' }, json: async () => body };
}

const NBSP = ' ';
const detail = {
    inventory_code: 'AN-2026-014', title: 'Sunset Over Baku', artist: { id: 5, name: 'Aygün Məmmədova' },
    image_url: null, genre: { slug: 'painting', name: 'Painting' }, medium: { slug: 'oil', name: 'Oil on canvas' },
    price: 3200, currency: 'AZN', availability: 'available', width_cm: 80, height_cm: 60,
    year_created: 2023, short_description: 'A description.', provenance: 'Directly from the artist.', certificate: true,
    frame_condition: 'Unframed', delivery_note: 'Delivered in Baku',
    images: [{ type: 'main', sort_order: 0, is_main: true, url: 'https://example.test/full.webp' }],
    similar: [], whatsapp_link: null, video: null,
};

let artwork;
let enquiryResponse = () => jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' });
function mockApi() {
    global.fetch = vi.fn((url) => {
        if (url.startsWith('/api/v1/enquiries')) return Promise.resolve(enquiryResponse());
        if (url.startsWith('/api/v1/artworks/')) return Promise.resolve(typeof artwork === 'function' ? artwork() : jsonResponse(200, { data: artwork }));
        if (url.startsWith('/api/v1/artists')) return Promise.resolve(jsonResponse(200, { data: [{ id: 5, slug: 'aygun-memmedova', first_name: 'Aygün', last_name: 'Məmmədova' }] }));
        if (url.startsWith('/api/v1/navigation')) return Promise.resolve(jsonResponse(200, { data: { header: [], footer: [] } }));
        return Promise.resolve(jsonResponse(200, { data: url.includes('social') ? [] : {} }));
    });
}
const calls = (prefix) => global.fetch.mock.calls.map(([url]) => url).filter((url) => url.startsWith(prefix));

function renderPage(extra = null) {
    return render(
        <LocaleProvider>
            <SiteDataProvider>
                {extra}
                <ArtworkDetailPage params={{ code: 'AN-2026-014' }} />
            </SiteDataProvider>
        </LocaleProvider>
    );
}

describe('ArtworkDetailPage', () => {
    const originalRO = global.ResizeObserver;

    beforeEach(() => {
        artwork = detail;
        mockApi();
        // jsdom has no layout: every measured container is 900px wide (window.innerHeight is 768 in jsdom).
        global.ResizeObserver = class {
            constructor(cb) { this.cb = cb; }
            observe() { this.cb([{ contentRect: { width: 900 } }]); }
            disconnect() {}
        };
    });

    afterEach(() => {
        global.ResizeObserver = originalRO;
        document.head.querySelectorAll('meta[property^="og:"], meta[name="description"]').forEach((m) => m.remove());
    });

    it('shows every detail field in its row, and a missing field produces no row', async () => {
        artwork = { ...detail, frame_condition: null, delivery_note: '', certificate: false };
        mockApi();
        renderPage();

        expect(await screen.findByRole('heading', { level: 1, name: 'Sunset Over Baku' })).toHaveClass('font-editorial', 'text-heading');
        const row = (key) => screen.getByTestId(`row-${key}`);
        expect(within(row('year')).getByText('2023')).toBeInTheDocument();
        expect(row('dimensions').querySelector('dd').textContent).toBe(`80${NBSP}×${NBSP}60${NBSP}sm`);
        expect(within(row('medium')).getByText('Oil on canvas')).toBeInTheDocument();
        expect(within(row('genre')).getByText('Painting')).toBeInTheDocument();
        expect(within(row('code')).getByText('AN-2026-014')).toBeInTheDocument();
        expect(within(row('provenance')).getByText('Directly from the artist.')).toBeInTheDocument();
        for (const key of ['frame', 'delivery', 'certificate']) expect(screen.queryByTestId(`row-${key}`)).not.toBeInTheDocument();
        expect(screen.getByTestId('artwork-price').textContent).toBe(`3${NBSP}200${NBSP}AZN`);
        expect(screen.getByText('A description.')).toHaveClass('font-editorial', 'text-reading');
    });

    it('hides the price of a sold work', async () => {
        artwork = { ...detail, availability: 'sold' };
        mockApi();
        renderPage();

        expect(await screen.findByTestId('artwork-price')).toHaveTextContent('Satılıb');
        expect(screen.getByTestId('artwork-price')).toHaveClass('text-ink-muted');
    });

    it('links the artist through the /artists index when the artwork has no slug (S3)', async () => {
        renderPage();

        expect(await screen.findByRole('link', { name: 'Aygün Məmmədova' })).toHaveAttribute('href', '/artists/aygun-memmedova');
        expect(calls('/api/v1/artists')).toHaveLength(1);
    });

    it('uses artist.slug directly once the API sends it, without the index request', async () => {
        artwork = { ...detail, artist: { id: 5, slug: 'from-api', name: 'Aygün Məmmədova' } };
        mockApi();
        renderPage();

        expect(await screen.findByRole('link', { name: 'Aygün Məmmədova' })).toHaveAttribute('href', '/artists/from-api');
        expect(calls('/api/v1/artists')).toHaveLength(0);
    });

    it('sizes the main field from centimetres (fits the 900px width and 70% of the viewport height)', async () => {
        renderPage();

        const field = await screen.findByTestId('artwork-main-field');
        const k = Math.min(900 / 80, Math.round(768 * 0.7) / 60);
        expect(field).toHaveStyle({ width: `${Math.round(80 * k)}px`, height: `${Math.round(60 * k)}px` });
        expect(field).toHaveClass('shadow-hang');
        expect(within(field).getByRole('img', { name: 'Sunset Over Baku, Aygün Məmmədova' })).toHaveAttribute('src', 'https://example.test/full.webp');
        expect(within(field).getByRole('img')).toHaveAttribute('loading', 'eager');
        expect(within(field).getByRole('img')).toHaveAttribute('fetchpriority', 'high');
    });

    it('switches the main image from the thumbnails and moves aria-current', async () => {
        artwork = {
            ...detail,
            images: [
                { type: 'main', sort_order: 0, is_main: true, url: 'https://example.test/one.webp' },
                { type: 'detail', sort_order: 1, is_main: false, url: 'https://example.test/two.webp' },
                { type: 'frame', sort_order: 2, is_main: false, url: 'https://example.test/three.webp' },
            ],
        };
        mockApi();
        renderPage();

        const main = () => within(screen.getByTestId('artwork-main-field')).getByRole('img');
        expect(await screen.findByRole('button', { name: 'Şəkil 1: əsas' })).toHaveAttribute('aria-current', 'true');
        expect(main()).toHaveAttribute('src', 'https://example.test/one.webp');

        await userEvent.click(screen.getByRole('button', { name: 'Şəkil 2: detal' }));

        expect(main()).toHaveAttribute('src', 'https://example.test/two.webp');
        expect(screen.getByRole('button', { name: 'Şəkil 2: detal' })).toHaveAttribute('aria-current', 'true');
        expect(screen.getByRole('button', { name: 'Şəkil 1: əsas' })).not.toHaveAttribute('aria-current');
    });

    it('redraws "divarda gör" at a new k for each wall height', async () => {
        renderPage();
        const work = async () => (await screen.findByTestId('wall-work')).style.height;

        const heights = {};
        for (const label of ['2,4 m', '2,7 m', '3,2 m']) {
            await userEvent.click(await screen.findByRole('button', { name: label }));
            expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
            heights[label] = await work();
        }
        // wall box: min(768 × 0.55, 520) = 422px high; k = min(900 / 246, 422 / wall cm, 1.6)
        expect(heights).toEqual({ '2,4 m': '96px', '2,7 m': `${Math.round(60 * (422 / 270))}px`, '3,2 m': `${Math.round(60 * (422 / 320))}px` });
        expect(new Set(Object.values(heights)).size).toBe(3);
        expect(screen.getByTestId('human-figure')).toHaveAttribute('height', String(Math.round(170 * (422 / 320))));
        expect(screen.getByText('170 sm')).toBeInTheDocument();
    });

    it('raises the wall for a work taller than it', async () => {
        artwork = { ...detail, width_cm: 80, height_cm: 300 };
        mockApi();
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: '2,4 m' }));
        expect(screen.getByText('divar 3,3 m')).toBeInTheDocument(); // 300 cm work + 30 cm air
        const wall = screen.getByTestId('wall');
        const work = screen.getByTestId('wall-work');
        expect(parseFloat(work.style.bottom) + parseFloat(work.style.height)).toBeLessThanOrEqual(parseFloat(wall.style.height));
    });

    it('shows a not-found page with a way back to the catalogue for a 404', async () => {
        artwork = () => jsonResponse(404, { message: '' });
        mockApi();
        renderPage();

        expect(await screen.findByRole('heading', { name: 'Əsər tapılmadı' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Kataloqa qayıt' })).toHaveAttribute('href', '/artworks');
        await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow'));
    });

    it('leaves out the similar-works section entirely when there are none, and shows it with a scale rule when there are', async () => {
        const { unmount } = renderPage();
        await screen.findByRole('heading', { level: 1 });
        expect(screen.queryByRole('heading', { name: 'Bənzər əsərlər' })).not.toBeInTheDocument();
        unmount();

        artwork = { ...detail, similar: [{ ...detail, inventory_code: 'AN-2', title: 'Other', images: undefined }] };
        mockApi();
        renderPage();
        const section = (await screen.findByRole('heading', { name: 'Bənzər əsərlər' })).closest('section');
        expect(within(section).getByTestId('scale-rule')).toBeInTheDocument();
        expect(within(section).getByText('Other')).toBeInTheDocument();
        expect(within(section).getByTestId('artwork-field')).not.toHaveClass('shadow-hang');
    });

    it('sets the title "<title>, <artist> | ArtNiyyətli", a word-safe 155-character description and Open Graph tags', async () => {
        const long = `${'Rəssamın bu dövrünə aid sakit ölçülü bir əsər '.repeat(5)}sonu.`;
        artwork = { ...detail, short_description: long };
        mockApi();
        renderPage();

        await waitFor(() => expect(document.title).toBe('Sunset Over Baku, Aygün Məmmədova | ArtNiyyətli'));
        const description = document.head.querySelector('meta[name="description"]').getAttribute('content');
        expect(description.length).toBeLessThanOrEqual(155);
        expect(description.endsWith('…')).toBe(true);
        expect(long.startsWith(description.slice(0, -1))).toBe(true);
        expect(long.charAt(description.length - 1)).toBe(' '); // cut at a word boundary
        expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://example.test/full.webp');
        expect(document.head.querySelector('meta[property="og:title"]')).toHaveAttribute('content', 'Sunset Over Baku, Aygün Məmmədova | ArtNiyyətli');
    });

    it('lets backend SEO overrides win once the API sends them (S6)', async () => {
        artwork = { ...detail, seo: { title: 'Override title', description: 'Override description', og_image_url: 'https://example.test/og.jpg' } };
        mockApi();
        renderPage();

        await waitFor(() => expect(document.title).toBe('Override title'));
        expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Override description');
        expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute('content', 'https://example.test/og.jpg');
    });

    it('shows a static skeleton with aria-busy while loading', () => {
        artwork = () => new Promise(() => {});
        global.fetch = vi.fn((url) => (url.startsWith('/api/v1/artworks/') ? new Promise(() => {}) : Promise.resolve(jsonResponse(200, { data: {} }))));
        renderPage();

        expect(screen.getByTestId('artwork-skeleton')).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByTestId('artwork-skeleton').innerHTML).not.toMatch(/animate-/);
    });

    it('renders WhatsApp and YouTube only when present', async () => {
        renderPage();
        await screen.findByRole('heading', { level: 1 });
        expect(screen.queryByRole('link', { name: /whatsapp/i })).not.toBeInTheDocument();
        expect(screen.queryByTitle(detail.title)).not.toBeInTheDocument();
    });

    it('renders the WhatsApp link and the YouTube embed when the API gives them', async () => {
        artwork = { ...detail, whatsapp_link: 'https://wa.me/994501234567?text=hi', video: { id: 'dQw4w9WgXcQ', embed_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' } };
        mockApi();
        renderPage();

        expect(await screen.findByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', 'https://wa.me/994501234567?text=hi');
        expect(screen.getByTitle(detail.title)).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('fills the enquiry form with the artwork code, read-only and visible, and sends it', async () => {
        renderPage();

        const code = await screen.findByLabelText('Əsərin kodu');
        expect(code).toHaveValue('AN-2026-014');
        expect(code).toHaveAttribute('readonly');
        const form = code.closest('form');
        expect(form.innerHTML).not.toMatch(/signal/); // no Signal before the form is sent
        expect(within(form).getByRole('button', { name: 'Göndər' })).toHaveClass('bg-wine', 'text-wine-ink');

        await userEvent.type(within(form).getByLabelText('Ad'), 'Aysel');
        await userEvent.click(within(form).getByRole('button', { name: 'Göndər' }));
        const [, init] = global.fetch.mock.calls.find(([url]) => url.startsWith('/api/v1/enquiries'));
        expect(JSON.parse(init.body)).toMatchObject({ subject: 'buy', artwork_code: 'AN-2026-014', name: 'Aysel' });
    });

    it('shows a server field error in signal-ink, tied to the field', async () => {
        enquiryResponse = () => jsonResponse(422, { message: 'The given data was invalid.', errors: { email: ['The email field is required.'] } });
        mockApi();
        renderPage();

        const form = (await screen.findByLabelText('Əsərin kodu')).closest('form');
        await userEvent.click(within(form).getByRole('button', { name: 'Göndər' }));

        const message = await within(form).findByText('The email field is required.');
        expect(message).toHaveClass('text-caption', 'text-signal-ink');
        const email = within(form).getByLabelText('E-poçt');
        expect(email).toHaveClass('border-signal-ink');
        expect(email).toHaveAttribute('aria-invalid', 'true');
        expect(email.getAttribute('aria-describedby')).toBe(message.id);
        enquiryResponse = () => jsonResponse(201, { message: 'Sorğunuz qeydə alındı.' });
    });

    it('shows success in plain ink, with no Signal and no green', async () => {
        renderPage();

        const form = (await screen.findByLabelText('Əsərin kodu')).closest('form');
        await userEvent.click(within(form).getByRole('button', { name: 'Göndər' }));

        const success = await within(form).findByRole('status');
        expect(success).toHaveTextContent('Sorğunuz qeydə alındı.');
        expect(success).toHaveClass('text-ink');
        expect(form.innerHTML).not.toMatch(/signal|green/);
    });

    it('does not crash when the locale changes after the page has loaded', async () => {
        renderPage(<LocaleSwitcher />);
        await screen.findByRole('heading', { level: 1 });

        await userEvent.click(screen.getByRole('button', { name: 'EN' }));

        expect(await screen.findByText('See it on a wall')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Sunset Over Baku' })).toBeInTheDocument();
    });
});
