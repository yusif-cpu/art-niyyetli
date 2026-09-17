import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DashboardScreen from '../screens/DashboardScreen.jsx';

describe('DashboardScreen', () => {
    it('shows a Rəssamlar stat card using the real artists count (regression check)', () => {
        const stats = {
            artists: 4,
            artworks: 12,
            exhibitions: 3,
            articles: 5,
            faqs: 8,
            enquiries: 2,
            enquiries_new: 0,
        };

        render(<DashboardScreen stats={stats} recentEnquiries={[]} upcomingExhibitions={[]} recentArtworks={[]} />);

        const label = screen.getByText('Rəssamlar');
        const card = label.closest('div');
        expect(within(card).getByText('4')).toBeInTheDocument();
        expect(screen.queryByText('Sənətkarlar')).not.toBeInTheDocument();
    });
});
