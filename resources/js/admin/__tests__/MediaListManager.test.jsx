import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import MediaListManager from '../components/MediaListManager.jsx';

function jsonResponse(data) {
    return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

describe('MediaListManager', () => {
    it('offers both Media-dan seç and Kompüterdən yüklə to add media (regression check)', () => {
        render(<MediaListManager items={[]} onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Media-dan seç' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Kompüterdən yüklə' })).toBeInTheDocument();
    });

    it('adds an item selected from the media library', async () => {
        global.fetch = vi.fn().mockResolvedValue(
            jsonResponse({ data: [{ id: 6, variants: [{ variant: 'thumbnail-webp', url: 'https://example.com/6.webp' }] }] })
        );

        const onChange = vi.fn();
        render(<MediaListManager items={[]} onChange={onChange} />);

        await userEvent.click(screen.getByRole('button', { name: 'Media-dan seç' }));
        const image = await screen.findByRole('img', { name: 'Media' });
        await userEvent.click(image);

        expect(onChange).toHaveBeenCalledWith([{ media_id: 6, type: undefined, sort_order: 0, url: 'https://example.com/6.webp' }]);
    });
});
