import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SocialLinks from '../components/SocialLinks.jsx';

const ICON = 'https://example.test/instagram.webp';

describe('SocialLinks', () => {
    it('renders logo and text together in logo_text mode', () => {
        const { container } = render(
            <SocialLinks links={[{ platform: 'Instagram', url: 'https://instagram.com/artniyyetli', display_mode: 'logo_text', logo_url: ICON }]} />
        );

        const link = screen.getByRole('link', { name: 'Instagram' });
        expect(link).toHaveAttribute('href', 'https://instagram.com/artniyyetli');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
        // Decorative image: the visible text already names the link.
        expect(container.querySelector('img')).toHaveAttribute('src', ICON);
        expect(container.querySelector('img')).toHaveAttribute('alt', '');
    });

    it('renders only the logo in logo_only mode, named by the platform', () => {
        render(<SocialLinks links={[{ platform: 'Instagram', url: 'https://instagram.com/artniyyetli', display_mode: 'logo_only', logo_url: ICON }]} />);

        expect(screen.queryByText('Instagram')).not.toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Instagram' })).toHaveAttribute('src', ICON);
        expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/artniyyetli');
    });

    it('renders only the text in text_only mode, even when a logo exists', () => {
        render(<SocialLinks links={[{ platform: 'Instagram', url: 'https://instagram.com/artniyyetli', display_mode: 'text_only', logo_url: ICON }]} />);

        expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('falls back to text when a logo mode has no logo, so the link never renders empty', () => {
        render(
            <SocialLinks
                links={[
                    { platform: 'Instagram', url: 'https://instagram.com/a', display_mode: 'logo_only', logo_url: null },
                    { platform: 'Facebook', url: 'https://facebook.com/b', display_mode: 'logo_text', logo_url: null },
                ]}
            />
        );

        expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Facebook' })).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('treats a missing display_mode as logo_text', () => {
        render(<SocialLinks links={[{ platform: 'Instagram', url: 'https://instagram.com/a', logo_url: ICON }]} />);

        expect(screen.getByText('Instagram')).toBeInTheDocument();
    });

    it('renders each link with its own mode, in the given order, allowing repeated platform names', () => {
        render(
            <SocialLinks
                links={[
                    { platform: 'Instagram', url: 'https://instagram.com/a', display_mode: 'logo_only', logo_url: ICON },
                    { platform: 'Instagram', url: 'https://instagram.com/b', display_mode: 'text_only', logo_url: ICON },
                ]}
            />
        );

        const links = screen.getAllByRole('link');
        expect(links.map((l) => l.getAttribute('href'))).toEqual(['https://instagram.com/a', 'https://instagram.com/b']);
        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.getAllByText('Instagram')).toHaveLength(1);
    });

    it('renders nothing when there are no links or the data has not loaded', () => {
        const { container, rerender } = render(<SocialLinks links={null} />);
        expect(container).toBeEmptyDOMElement();

        rerender(<SocialLinks links={[]} />);
        expect(container).toBeEmptyDOMElement();
    });
    describe('address safety', () => {
        const link = (url, platform = 'Instagram') => ({ platform, url, display_mode: 'text_only', logo_url: null });

        it('renders both http and https addresses', () => {
            render(<SocialLinks links={[link('https://instagram.com/a', 'Secure'), link('http://example.org/b', 'Plain')]} />);

            expect(screen.getByRole('link', { name: 'Secure' })).toHaveAttribute('href', 'https://instagram.com/a');
            expect(screen.getByRole('link', { name: 'Plain' })).toHaveAttribute('href', 'http://example.org/b');
        });

        it.each([
            ['javascript:', 'javascript:alert(1)'],
            ['javascript: in capitals', 'JAVASCRIPT:alert(1)'],
            ['javascript: with a leading space', '  javascript:alert(1)'],
            ['javascript: with an embedded tab', 'java	script:alert(1)'],
            ['data:', 'data:text/html,<script>alert(1)</script>'],
            ['vbscript:', 'vbscript:msgbox(1)'],
            ['file:', 'file:///etc/passwd'],
            ['mailto:', 'mailto:someone@example.org'],
            ['a protocol-relative address', '//evil.example/x'],
            ['a relative path', '/admin'],
            ['not an address at all', 'instagram'],
            ['an empty string', ''],
            ['a missing address', undefined],
            ['null', null],
        ])('does not render a link for %s', (_label, url) => {
            render(<SocialLinks links={[link(url, 'Unsafe'), link('https://instagram.com/ok', 'Safe')]} />);

            expect(screen.queryByRole('link', { name: 'Unsafe' })).not.toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Safe' })).toHaveAttribute('href', 'https://instagram.com/ok');
            expect(screen.getAllByRole('link')).toHaveLength(1);
        });

        it('renders nothing at all when every address is unsafe', () => {
            const { container } = render(<SocialLinks links={[link('javascript:alert(1)'), link('data:text/plain,x')]} />);

            expect(container).toBeEmptyDOMElement();
        });

        it('tolerates an entry that is not an object', () => {
            render(<SocialLinks links={[null, undefined, link('https://instagram.com/ok', 'Safe')]} />);

            expect(screen.getAllByRole('link')).toHaveLength(1);
        });
    });
});
