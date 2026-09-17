// resources/js/public/__tests__/useRouter.test.jsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useRouter } from '../lib/useRouter.js';

describe('useRouter', () => {
    beforeEach(() => {
        window.history.pushState(null, '', '/');
    });

    it('resolves the home page for /', () => {
        const { result } = renderHook(() => useRouter());
        expect(result.current.page).toBe('home');
    });

    it('resolves a static list route', () => {
        window.history.pushState(null, '', '/artworks');
        const { result } = renderHook(() => useRouter());
        expect(result.current.page).toBe('catalogue');
    });

    it('resolves a dynamic segment and captures its param', () => {
        window.history.pushState(null, '', '/artworks/AN-2026-014');
        const { result } = renderHook(() => useRouter());
        expect(result.current.page).toBe('artwork-detail');
        expect(result.current.params).toEqual({ code: 'AN-2026-014' });
    });

    it('falls back to static-page for an unrecognized single segment', () => {
        window.history.pushState(null, '', '/about');
        const { result } = renderHook(() => useRouter());
        expect(result.current.page).toBe('static-page');
        expect(result.current.params).toEqual({ slug: 'about' });
    });

    it('resolves not-found for an unmatched multi-segment path', () => {
        window.history.pushState(null, '', '/a/b/c');
        const { result } = renderHook(() => useRouter());
        expect(result.current.page).toBe('not-found');
    });

    it('navigate() pushes history state and updates the resolved page', () => {
        const { result } = renderHook(() => useRouter());

        act(() => result.current.navigate('/artists/aygun-mammadova'));

        expect(window.location.pathname).toBe('/artists/aygun-mammadova');
        expect(result.current.page).toBe('artist-detail');
        expect(result.current.params).toEqual({ slug: 'aygun-mammadova' });
    });

    it('updates on browser back/forward (popstate)', () => {
        const { result } = renderHook(() => useRouter());

        act(() => result.current.navigate('/artworks'));
        expect(result.current.page).toBe('catalogue');

        act(() => {
            window.history.pushState(null, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
        });

        expect(result.current.page).toBe('home');
    });
});
