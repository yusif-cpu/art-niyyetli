import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from '../App.jsx';

function jsonResponse(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => 'application/json' },
        json: async () => data,
    };
}

const initialSession = {
    message: 'Authenticated admin access confirmed.',
    user: { id: 1, username: 'jane.admin', roles: ['administrator'] },
    stats: {
        artists: 2,
        artworks: 5,
        exhibitions: 1,
        articles: 0,
        faqs: 3,
        enquiries: 4,
        enquiries_new: 1,
    },
    recent_enquiries: [],
    upcoming_exhibitions: [],
    recent_artworks: [],
};

describe('Dashboard live enquiry stats', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        window.location.hash = '';
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('updates the dashboard enquiry count and new badge from the existing polling endpoint, without a second polling route', async () => {
        global.fetch = vi.fn((url) => {
            if (url === '/admin/dashboard') {
                return Promise.resolve(jsonResponse(200, initialSession));
            }
            if (url === '/admin/enquiries/status') {
                return Promise.resolve(jsonResponse(200, { data: { latest_id: 10, new_count: 3, total_count: 6 } }));
            }
            throw new Error(`Unexpected fetch to ${url}`);
        });

        render(<App />);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(screen.getByRole('heading', { name: 'Nəzarət paneli' })).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();
        expect(screen.getByText('3 yeni')).toBeInTheDocument();

        const enquiryStatusCalls = global.fetch.mock.calls.filter(([url]) => url === '/admin/enquiries/status');
        expect(enquiryStatusCalls).toHaveLength(1);
    });
});
