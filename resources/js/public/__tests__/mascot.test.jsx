import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocaleProvider } from '../i18n/LocaleContext.jsx';
import MascotSnake from '../components/MascotSnake.jsx';
import PageLoadingIndicator from '../layout/PageLoadingIndicator.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import HomePage from '../pages/HomePage.jsx';
import { publicApiFetch } from '../lib/api.js';

const source = readFileSync(resolve(__dirname, '../../../../brand/maskot-ilan.svg'), 'utf8');
const sourceBody = /class="ilan-govde"[^>]*\sd="([^"]+)"/.exec(source)[1];

function jsonResponse(body) {
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body };
}

// prefers-reduced-motion as the visitor sets it; jsdom has no matchMedia of its own.
function setReducedMotion(reduce) {
    window.matchMedia = vi.fn((query) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
}

const snake = (container) => container.querySelector('svg[data-mascot]');
const noStyle = (svg) => {
    expect(svg.hasAttribute('style')).toBe(false);
    expect(svg.querySelectorAll('[style]')).toHaveLength(0);
};

describe('MascotSnake', () => {
    const originalMatchMedia = window.matchMedia;
    beforeEach(() => setReducedMotion(false));
    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    it.each([
        ['draw', ['mascot-draw'], true],
        ['travel', ['mascot-travel'], false],
        ['static', [], true],
    ])('renders in "%s" mode', (mode, classes, hasHead) => {
        const { container } = render(<MascotSnake mode={mode} />);
        const svg = snake(container);

        expect(svg).toHaveAttribute('data-mascot', mode);
        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(svg).toHaveAttribute('viewBox', '0 0 400 46');
        classes.forEach((name) => expect(svg).toHaveClass(name));
        if (mode === 'static') expect(svg.getAttribute('class')).not.toMatch(/mascot-(draw|travel)/);
        expect(Boolean(svg.querySelector('.ilan-bas'))).toBe(hasHead);
        noStyle(svg);
    });

    it('takes its drawing from brand/maskot-ilan.svg, colours it with currentColor and copies no style from it', () => {
        const { container } = render(<MascotSnake mode="static" />);
        const body = container.querySelector('.ilan-govde');

        expect(body).toHaveAttribute('d', sourceBody);
        expect(body).toHaveAttribute('pathLength', '1');
        expect(body).toHaveAttribute('stroke', 'currentColor');
        container.querySelectorAll('.ilan-bas path').forEach((path) => {
            expect(path).toHaveAttribute('fill', 'currentColor');
            expect(path).toHaveAttribute('fill-rule', 'evenodd'); // the eye is a hole: the surface shows through
        });
        expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}|role="img"/i);
    });

    it('sizes from `width` (default 420) with the viewBox ratio, and never wider than its container', () => {
        const { container, rerender } = render(<MascotSnake />);
        expect(snake(container)).toHaveAttribute('width', '420');
        expect(snake(container)).toHaveAttribute('height', '48');
        expect(snake(container)).toHaveClass('max-w-full', 'h-auto');

        rerender(<MascotSnake width={240} />);
        expect(snake(container)).toHaveAttribute('height', '28');
    });

    it('uses the 1100 ms draw only when asked, and holds a paused drawing undrawn', () => {
        const { container, rerender } = render(<MascotSnake mode="draw" drawMs={1100} />);
        expect(snake(container)).toHaveClass('mascot-draw', 'mascot-quick');

        rerender(<MascotSnake mode="draw" paused />);
        expect(snake(container)).toHaveClass('mascot-draw', 'mascot-paused');
        expect(snake(container)).not.toHaveClass('mascot-quick');
    });

    describe('with prefers-reduced-motion: reduce', () => {
        beforeEach(() => setReducedMotion(true));

        it.each(['draw', 'travel'])('puts no animation class on in "%s" mode: the end state shows at once', (mode) => {
            const { container } = render(<MascotSnake mode={mode} drawMs={1100} paused />);
            const svg = snake(container);

            expect(svg.getAttribute('class')).not.toMatch(/mascot-(draw|travel|quick|paused)/);
            // draw: the whole snake with its head; travel: a still, full line.
            expect(Boolean(svg.querySelector('.ilan-bas'))).toBe(mode === 'draw');
            expect(svg.querySelector('.ilan-govde')).toBeInTheDocument();
            noStyle(svg);
        });
    });

    it('keeps the motion rules in public.css: dash offset and opacity only, no turning, plain ease-out', () => {
        const css = readFileSync(resolve(__dirname, '../../../css/public.css'), 'utf8');
        const block = css.slice(css.indexOf('/* The mascot snake'), css.indexOf('/* Reduced motion: turn transitions'));

        expect(block).toMatch(/\.mascot-draw \.ilan-govde \{[^}]*animation: mascot-draw 1300ms ease-out forwards/);
        expect(block).toMatch(/\.mascot-draw \.ilan-bas \{[^}]*animation: mascot-head 180ms linear 1300ms forwards/);
        expect(block).toMatch(/\.mascot-draw\.mascot-quick \.ilan-govde \{[^}]*animation-duration: 1100ms/);
        expect(block).toMatch(/\.mascot-travel \.ilan-govde \{[^}]*stroke-dasharray: 0\.18 1;[^}]*animation: mascot-travel 1200ms linear infinite/);
        expect(block).not.toMatch(/rotate|transform|cubic-bezier\([^)]*1\.[0-9]|gradient|shadow|radius/);
        expect(block).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    });
});

describe('the home seal', () => {
    const originalIO = global.IntersectionObserver;
    const originalRO = global.ResizeObserver;
    let observers;

    beforeEach(() => {
        localStorage.removeItem('public-locale');
        setReducedMotion(false);
        observers = [];
        global.IntersectionObserver = class {
            constructor(callback, options) {
                this.callback = callback;
                this.options = options;
                this.observe = vi.fn();
                this.disconnect = vi.fn();
                observers.push(this);
            }
        };
        global.ResizeObserver = class { observe() {} disconnect() {} };
        global.fetch = vi.fn(() => Promise.resolve(jsonResponse({ data: { page: null, wall: [], featured: [], artists: [], faqs: [] } })));
    });
    afterEach(() => {
        global.IntersectionObserver = originalIO;
        global.ResizeObserver = originalRO;
    });

    it('sits last on the page: the lockup over the snake, decorative, in brand red', async () => {
        render(<LocaleProvider><HomePage /></LocaleProvider>);
        const seal = await screen.findByTestId('home-seal');

        expect(seal.parentElement.lastElementChild).toBe(seal);
        expect(seal).toHaveAttribute('aria-hidden', 'true');
        expect(seal).toHaveClass('text-brand', 'items-center');
        expect(seal.querySelector('svg[data-logo]')).toHaveAttribute('data-logo', 'lockup');
        expect(seal.querySelector('svg[data-mascot]')).toHaveAttribute('data-mascot', 'draw');
        expect(seal.textContent.trim()).toBe('');
    });

    it('starts the drawing the first time 40% of it is on screen, then disconnects the observer', async () => {
        render(<LocaleProvider><HomePage /></LocaleProvider>);
        const seal = await screen.findByTestId('home-seal');
        const mascot = () => seal.querySelector('svg[data-mascot]');

        // The observer is made in an effect, which can run after the element is already in the DOM (under load the
        // full suite caught it before): wait for it rather than look once.
        const observer = await waitFor(() => {
            const found = observers.find((o) => o.observe.mock.calls.some(([node]) => node === seal));
            expect(found).toBeDefined();
            return found;
        });
        expect(observer.options).toEqual({ threshold: 0.4 });
        expect(mascot()).toHaveClass('mascot-draw', 'mascot-paused');

        act(() => observer.callback([{ isIntersecting: false }]));
        expect(mascot()).toHaveClass('mascot-paused');
        expect(observer.disconnect).not.toHaveBeenCalled();

        act(() => observer.callback([{ isIntersecting: true }]));
        expect(mascot()).toHaveClass('mascot-draw');
        expect(mascot()).not.toHaveClass('mascot-paused');
        expect(observer.disconnect).toHaveBeenCalledTimes(1);
        expect(observer.observe).toHaveBeenCalledTimes(1);
    });
});

describe('the page loading indicator', () => {
    beforeEach(() => {
        localStorage.removeItem('public-locale');
        setReducedMotion(false);
    });

    it('is in the DOM only while a request is in flight, with a status text for screen readers', async () => {
        let finish;
        global.fetch = vi.fn(() => new Promise((done) => { finish = () => done(jsonResponse({ data: [] })); }));
        render(<LocaleProvider><PageLoadingIndicator /></LocaleProvider>);

        expect(screen.queryByTestId('page-loading')).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('');

        let request;
        act(() => {
            request = publicApiFetch('/artists', { locale: 'az' });
        });
        const indicator = screen.getByTestId('page-loading');
        const svg = indicator.querySelector('svg[data-mascot]');
        expect(svg).toHaveAttribute('data-mascot', 'travel');
        expect(svg).toHaveClass('mascot-travel');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(indicator).toHaveClass('text-brand', 'pointer-events-none', 'fixed', 'top-0');
        expect(screen.getByRole('status')).toHaveTextContent('Yüklənir');
        noStyle(svg);

        await act(async () => {
            finish();
            await request;
        });
        await waitFor(() => expect(screen.queryByTestId('page-loading')).not.toBeInTheDocument());
        expect(screen.getByRole('status')).toHaveTextContent('');
    });

    it('also leaves when the request fails', async () => {
        global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
        render(<LocaleProvider><PageLoadingIndicator /></LocaleProvider>);

        await act(async () => {
            await publicApiFetch('/artists').catch(() => null);
        });
        expect(screen.queryByTestId('page-loading')).not.toBeInTheDocument();
    });
});

describe('the 404 page', () => {
    beforeEach(() => {
        localStorage.removeItem('public-locale');
        setReducedMotion(false);
    });

    it('draws the snake once (1100 ms) over the not-found heading, in brand red', () => {
        const { container } = render(<LocaleProvider><NotFoundPage /></LocaleProvider>);
        const svg = snake(container);
        const heading = screen.getByRole('heading', { level: 1, name: 'Səhifə tapılmadı' });

        expect(svg).toHaveAttribute('data-mascot', 'draw');
        expect(svg).toHaveClass('mascot-draw', 'mascot-quick', 'text-brand');
        expect(svg).not.toHaveClass('mascot-paused');
        expect(svg.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        noStyle(svg);
    });
});
