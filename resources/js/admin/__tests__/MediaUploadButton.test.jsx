import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import MediaUploadButton from '../components/MediaUploadButton.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const mediaItem = {
    id: 7,
    original_filename: 'sekil.jpg',
    variants: [{ variant: 'thumbnail-webp', url: 'https://example.com/sekil.webp' }],
};

describe('MediaUploadButton', () => {
    it('uploads a selected file and calls onUploaded with id and preview url', async () => {
        global.fetch = vi.fn((url, options) => {
            const method = options?.method || 'GET';
            if (url === '/admin/media' && method === 'POST') {
                return Promise.resolve(jsonResponse(200, { data: mediaItem }));
            }

            return Promise.resolve(jsonResponse(200, { data: {} }));
        });

        const onUploaded = vi.fn();
        const { container } = render(<MediaUploadButton onUploaded={onUploaded} />);

        expect(screen.getByText('Şəkil əlavə et')).toBeInTheDocument();

        const fileInput = container.querySelector('input[type="file"]');
        const file = new File(['x'], 'good.png', { type: 'image/png' });
        await userEvent.upload(fileInput, file);

        await waitFor(() => {
            expect(onUploaded).toHaveBeenCalledWith(7, 'https://example.com/sekil.webp');
        });
    });

    it('shows a mapped error message for a rejected upload', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve(jsonResponse(422, { message: 'The file must not be greater than 5120 kilobytes.' }))
        );

        const onUploaded = vi.fn();
        const { container } = render(<MediaUploadButton onUploaded={onUploaded} />);

        const fileInput = container.querySelector('input[type="file"]');
        const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
        await userEvent.upload(fileInput, file);

        await waitFor(() => {
            expect(screen.getByText('Bu şəkil həddindən artıq böyükdür.')).toBeInTheDocument();
        });

        expect(screen.queryByText('The file must not be greater than 5120 kilobytes.')).not.toBeInTheDocument();
        expect(onUploaded).not.toHaveBeenCalled();
    });

    it('renders a custom label when provided', () => {
        render(<MediaUploadButton label="Faylı yüklə" onUploaded={vi.fn()} />);

        expect(screen.getByText('Faylı yüklə')).toBeInTheDocument();
    });
});
