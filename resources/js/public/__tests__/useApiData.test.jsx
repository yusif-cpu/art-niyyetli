import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useApiData } from '../lib/useApiData.js';
import { PublicApiError } from '../lib/api.js';

describe('useApiData', () => {
    it('starts in a loading state with no data', () => {
        const fetcher = () => new Promise(() => {});
        const { result } = renderHook(() => useApiData(fetcher, []));

        expect(result.current).toEqual({ data: null, meta: null, loading: true, error: null });
    });

    it('resolves with data and meta from the API envelope', async () => {
        const fetcher = () => Promise.resolve({ data: [{ id: 1 }], meta: { current_page: 1, last_page: 3 } });
        const { result } = renderHook(() => useApiData(fetcher, []));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.data).toEqual([{ id: 1 }]);
        expect(result.current.meta).toEqual({ current_page: 1, last_page: 3 });
        expect(result.current.error).toBeNull();
    });

    it('exposes meta as null for a non-paginated envelope', async () => {
        const fetcher = () => Promise.resolve({ data: { title: 'Ana səhifə' } });
        const { result } = renderHook(() => useApiData(fetcher, []));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.meta).toBeNull();
    });

    it('captures a PublicApiError on rejection, including its status', async () => {
        const fetcher = () => Promise.reject(new PublicApiError(404, 'Not found.'));
        const { result } = renderHook(() => useApiData(fetcher, []));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeInstanceOf(PublicApiError);
        expect(result.current.error.status).toBe(404);
    });

    it('refetches when a dependency changes', async () => {
        const fetcher = vi.fn()
            .mockResolvedValueOnce({ data: 'first' })
            .mockResolvedValueOnce({ data: 'second' });

        const { result, rerender } = renderHook(({ dep }) => useApiData(fetcher, [dep]), { initialProps: { dep: 'az' } });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.data).toBe('first');

        rerender({ dep: 'en' });
        await waitFor(() => expect(result.current.data).toBe('second'));

        expect(fetcher).toHaveBeenCalledTimes(2);
    });
});
