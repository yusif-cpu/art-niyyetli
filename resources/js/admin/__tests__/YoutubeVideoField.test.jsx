import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import YoutubeVideoField from '../components/YoutubeVideoField.jsx';

describe('YoutubeVideoField', () => {
    it('renders the current URL and calls onChange as the admin types', async () => {
        const onChange = vi.fn();
        render(<YoutubeVideoField url="" onChange={onChange} videoId={null} error={null} />);

        await userEvent.type(screen.getByLabelText('YouTube video linki'), 'x');

        expect(onChange).toHaveBeenCalledWith('x');
    });

    it('does not render a preview when there is no saved video id', () => {
        render(<YoutubeVideoField url="" onChange={vi.fn()} videoId={null} error={null} />);
        expect(screen.queryByTitle('YouTube video preview')).not.toBeInTheDocument();
    });

    it('renders a preview iframe built only from the trusted server-provided video id', () => {
        render(<YoutubeVideoField url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" onChange={vi.fn()} videoId="dQw4w9WgXcQ" error={null} />);

        const iframe = screen.getByTitle('YouTube video preview');
        expect(iframe).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    });

    it('shows a validation error when provided', () => {
        render(<YoutubeVideoField url="not-a-url" onChange={vi.fn()} videoId={null} error="Zəhmət olmasa etibarlı YouTube video linki daxil edin." />);
        expect(screen.getByText('Zəhmət olmasa etibarlı YouTube video linki daxil edin.')).toBeInTheDocument();
    });
});
