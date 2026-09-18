import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from './lib/api.js';
import { useHashRoute } from './lib/useHashRoute.js';
import { useEnquiryPolling } from './lib/useEnquiryPolling.js';
import { ThemeProvider } from './components/ThemeContext.jsx';
import { ToastProvider } from './components/ToastContext.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import PagesScreen from './screens/PagesScreen.jsx';
import NavigationScreen from './screens/NavigationScreen.jsx';
import FaqScreen from './screens/FaqScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';
import SocialLinksScreen from './screens/SocialLinksScreen.jsx';
import EnquiriesScreen from './screens/EnquiriesScreen.jsx';
import ArtworksScreen from './screens/ArtworksScreen.jsx';
import ArtistsScreen from './screens/ArtistsScreen.jsx';
import ExhibitionsScreen from './screens/ExhibitionsScreen.jsx';
import ArticlesScreen from './screens/ArticlesScreen.jsx';
import MediaScreen from './screens/MediaScreen.jsx';
import UsersScreen from './screens/UsersScreen.jsx';
import AdminShell from './layout/AdminShell.jsx';

const SCREENS = {
    dashboard: DashboardScreen,
    pages: PagesScreen,
    navigation: NavigationScreen,
    faqs: FaqScreen,
    settings: SettingsScreen,
    'social-links': SocialLinksScreen,
    enquiries: EnquiriesScreen,
    artworks: ArtworksScreen,
    artists: ArtistsScreen,
    exhibitions: ExhibitionsScreen,
    articles: ArticlesScreen,
    media: MediaScreen,
    users: UsersScreen,
};

function AuthenticatedApp({ session, onLogout }) {
    const [route, navigate] = useHashRoute();
    const Screen = SCREENS[route] || DashboardScreen;
    const { newCount, totalCount, refreshSignal } = useEnquiryPolling(session.stats?.enquiries_new, session.stats?.enquiries);
    const stats = { ...session.stats, enquiries: totalCount, enquiries_new: newCount };

    return (
        <AdminShell
            user={session.user}
            current={route}
            onNavigate={navigate}
            onLogout={onLogout}
            badges={{ enquiries: newCount }}
        >
            <Screen
                stats={stats}
                recentEnquiries={session.recent_enquiries}
                upcomingExhibitions={session.upcoming_exhibitions}
                recentArtworks={session.recent_artworks}
                enquiryRefreshSignal={refreshSignal}
            />
        </AdminShell>
    );
}

export default function App() {
    const [session, setSession] = useState(undefined); // undefined = loading, null = unauthenticated

    useEffect(() => {
        apiFetch('/dashboard')
            .then(setSession)
            .catch((err) => {
                if (err instanceof ApiError && err.status === 401) {
                    setSession(null);
                }
            });
    }, []);

    async function logout() {
        await apiFetch('/logout', { method: 'POST' });
        setSession(null);
    }

    return (
        <ThemeProvider>
            <ToastProvider>
                {session === undefined && <p className="p-6 text-sm text-neutral-500 dark:text-neutral-400">Yüklənir...</p>}
                {session === null && <LoginScreen onLoggedIn={setSession} />}
                {session && <AuthenticatedApp session={session} onLogout={logout} />}
            </ToastProvider>
        </ThemeProvider>
    );
}
