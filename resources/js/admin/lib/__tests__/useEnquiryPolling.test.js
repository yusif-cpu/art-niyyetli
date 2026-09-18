import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEnquiryPolling } from '../useEnquiryPolling.js';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

describe('useEnquiryPolling', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fetches status on mount and updates the new-enquiry and total counts', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve(jsonResponse(200, { data: { latest_id: 5, new_count: 2, total_count: 9 } }))
        );

        const { result } = renderHook(() => useEnquiryPolling(0, 0));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(result.current.newCount).toBe(2);
        expect(result.current.totalCount).toBe(9);
        expect(global.fetch).toHaveBeenCalledWith('/admin/enquiries/status', expect.anything());
    });

    it('bumps the refresh signal when the latest enquiry id changes between polls', async () => {
        let latestId = 5;
        global.fetch = vi.fn(() =>
            Promise.resolve(jsonResponse(200, { data: { latest_id: latestId, new_count: 1 } }))
        );

        const { result } = renderHook(() => useEnquiryPolling(0));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        const initialSignal = result.current.refreshSignal;

        latestId = 6;
        await act(async () => {
            await vi.advanceTimersByTimeAsync(15000);
        });

        expect(result.current.refreshSignal).toBe(initialSignal + 1);
    });

    it('does not bump the refresh signal when the latest id is unchanged', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve(jsonResponse(200, { data: { latest_id: 5, new_count: 1 } }))
        );

        const { result } = renderHook(() => useEnquiryPolling(0));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        const initialSignal = result.current.refreshSignal;

        await act(async () => {
            await vi.advanceTimersByTimeAsync(15000);
        });

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(result.current.refreshSignal).toBe(initialSignal);
    });

    it('skips polling while the tab is hidden', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve(jsonResponse(200, { data: { latest_id: 5, new_count: 1 } }))
        );

        renderHook(() => useEnquiryPolling(0));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        expect(global.fetch).toHaveBeenCalledTimes(1);

        Object.defineProperty(document, 'hidden', { value: true, configurable: true });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(15000);
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);

        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    });
});
