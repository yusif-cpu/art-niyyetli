import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PageImageUpload from '../components/PageImageUpload.jsx';

function jsonResponse(data) {
    return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

describe('PageImageUpload', () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue(
            jsonResponse({
                data: {
                    id: 7,
                    variants: [
                        { variant: 'thumbnail-webp', url: 'https://example.com/7-thumb.webp' },
                        { variant: 'detail-webp', url: 'https://example.com/7-detail.webp' },
                    ],
                },
            })
        );
    });

    it('renders the empty state and both add-image options when value is null', () => {
        render(<PageImageUpload value={null} previewUrl={null} onChange={vi.fn()} />);

        expect(screen.getByText('Şəkil əlavə edilməyib')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Media-dan seç' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kompüterdən yüklə' })).toBeInTheDocument();
    });

    it('opens the media library, lists items, and selects one without uploading (regression check)', async () => {
        const onChange = vi.fn();
        global.fetch = vi.fn().mockResolvedValue(
            jsonResponse({
                data: [{ id: 3, variants: [{ variant: 'thumbnail-webp', url: 'https://example.com/3.webp' }] }],
            })
        );

        render(<PageImageUpload value={null} previewUrl={null} onChange={onChange} />);

        await userEvent.click(screen.getByRole('button', { name: 'Media-dan seç' }));

        const image = await screen.findByRole('img', { name: 'Media' });
        await userEvent.click(image);

        expect(onChange).toHaveBeenCalledWith(3, 'https://example.com/3.webp');
    });

    it('uploads the selected file and calls onChange with the returned id and variant url', async () => {
        const onChange = vi.fn();
        render(<PageImageUpload value={null} previewUrl={null} onChange={onChange} />);

        const file = new File(['content'], 'photo.png', { type: 'image/png' });
        const input = document.querySelector('input[type="file"]');

        await userEvent.upload(input, file);

        expect(global.fetch).toHaveBeenCalledWith(
            '/admin/media',
            expect.objectContaining({ method: 'POST', body: expect.any(FormData) })
        );
        expect(onChange).toHaveBeenCalledWith(7, 'https://example.com/7-detail.webp');
    });

    it('renders the preview and both change options plus Sil when value is set', () => {
        render(<PageImageUpload value={7} previewUrl="https://example.com/7-detail.webp" onChange={vi.fn()} />);

        expect(screen.getByRole('img', { name: 'Seçilmiş şəkil' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Media-dan seç' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kompüterdən yüklə' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sil' })).toBeInTheDocument();
    });

    it('clicking Sil calls onChange(null, null) without a network call', async () => {
        const onChange = vi.fn();
        render(<PageImageUpload value={7} previewUrl="https://example.com/7-detail.webp" onChange={onChange} />);

        await userEvent.click(screen.getByRole('button', { name: 'Sil' }));

        expect(onChange).toHaveBeenCalledWith(null, null);
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
