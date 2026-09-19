import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import YoutubeEmbed from '../components/YoutubeEmbed.jsx';

describe('YoutubeEmbed', () => {
    it('renders an iframe using the server-provided embed_url', () => {
        render(<YoutubeEmbed video={{ id: 'dQw4w9WgXcQ', embed_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' }} title="A video" />);

        const iframe = screen.getByTitle('A video');
        expect(iframe.tagName).toBe('IFRAME');
        expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
        expect(iframe).toHaveAttribute('allowFullScreen');
    });

    it('renders nothing when there is no video', () => {
        const { container } = render(<YoutubeEmbed video={null} title="A video" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the video has no embed_url', () => {
        const { container } = render(<YoutubeEmbed video={{ id: 'x' }} title="A video" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('falls back to a generic title when none is provided', () => {
        render(<YoutubeEmbed video={{ id: 'dQw4w9WgXcQ', embed_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' }} />);
        expect(screen.getByTitle('YouTube video')).toBeInTheDocument();
    });
});
