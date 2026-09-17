import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import ArtworkImageManager from '../components/ArtworkImageManager.jsx';

function jsonResponse(data) {
    return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

describe('ArtworkImageManager', () => {
    it('offers both Media-dan seç and Kompüterdən yüklə to add an image (regression check)', () => {
        render(<ArtworkImageManager images={[]} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Media-dan seç' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kompüterdən yüklə' })).toBeInTheDocument();
    });

    it('adds an image selected from the media library', async () => {
        global.fetch = vi.fn().mockResolvedValue(
            jsonResponse({ data: [{ id: 5, variants: [{ variant: 'thumbnail-webp', url: 'https://example.com/5.webp' }] }] })
        );

        const onChange = vi.fn();
        render(<ArtworkImageManager images={[]} onChange={onChange} />);

        await userEvent.click(screen.getByRole('button', { name: 'Media-dan seç' }));
        const image = await screen.findByRole('img', { name: 'Media' });
        await userEvent.click(image);

        expect(onChange).toHaveBeenCalledWith([
            { media_id: 5, type: 'detail', sort_order: 0, is_main: true, url: 'https://example.com/5.webp' },
        ]);
    });
});
