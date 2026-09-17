import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MediaPicker from '../components/MediaPicker.jsx';

function jsonResponse(data) {
    return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

describe('MediaPicker', () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue(
            jsonResponse({
                data: [
                    { id: 1, variants: [{ variant: 'thumbnail-webp', url: 'https://example.com/1.webp' }] },
                    { id: 2, variants: [{ variant: 'thumbnail-webp', url: 'https://example.com/2.webp' }] },
                ],
            })
        );
    });

    it('shows both media thumbnails when the picker is opened', async () => {
        render(<MediaPicker value={null} previewUrl={null} onChange={vi.fn()} />);

        await userEvent.click(screen.getByRole('button', { name: 'Media-dan seç' }));

        await waitFor(() => {
            expect(screen.getAllByRole('img')).toHaveLength(2);
        });
    });

    it('calls onChange with the selected media id', async () => {
        const onChange = vi.fn();
        render(<MediaPicker value={null} previewUrl={null} onChange={onChange} />);

        await userEvent.click(screen.getByRole('button', { name: 'Media-dan seç' }));

        const images = await screen.findAllByRole('img');
        await userEvent.click(images[0]);

        expect(onChange).toHaveBeenCalledWith(1, 'https://example.com/1.webp');
    });

    it('shows a Kompüterdən yüklə button and uploads the selected file directly (regression check)', async () => {
        const onChange = vi.fn();
        global.fetch = vi.fn().mockResolvedValue(
            jsonResponse({
                data: {
                    id: 9,
                    variants: [
                        { variant: 'thumbnail-webp', url: 'https://example.com/9-thumb.webp' },
                        { variant: 'detail-webp', url: 'https://example.com/9-detail.webp' },
                    ],
                },
            })
        );

        render(<MediaPicker value={null} previewUrl={null} onChange={onChange} />);

        expect(screen.getByRole('button', { name: 'Kompüterdən yüklə' })).toBeInTheDocument();

        const file = new File(['content'], 'portrait.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]');

        await userEvent.upload(input, file);

        expect(global.fetch).toHaveBeenCalledWith(
            '/admin/media',
            expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
        );
        expect(onChange).toHaveBeenCalledWith(9, 'https://example.com/9-detail.webp');
    });
});
