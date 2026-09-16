import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from './lib/api.js';
import { useHashRoute } from './lib/useHashRoute.js';
import { ToastProvider } from './components/ToastContext.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import PlaceholderScreen from './screens/PlaceholderScreen.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import PagesScreen from './screens/PagesScreen.jsx';
import FaqScreen from './screens/FaqScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';
import SocialLinksScreen from './screens/SocialLinksScreen.jsx';
import AdminShell from './layout/AdminShell.jsx';

const SCREENS = {
    dashboard: DashboardScreen,
    pages: PagesScreen,
    faqs: FaqScreen,
    settings: SettingsScreen,
    'social-links': SocialLinksScreen,
    artworks: PlaceholderScreen,
    exhibitions: PlaceholderScreen,
    articles: PlaceholderScreen,
    media: PlaceholderScreen,
    users: PlaceholderScreen,
};

function AuthenticatedApp({ session, onLogout }) {
    const [route, navigate] = useHashRoute();
    const Screen = SCREENS[route] || DashboardScreen;

    return (
        <AdminShell user={session.user} current={route} onNavigate={navigate} onLogout={onLogout}>
            <Screen stats={session.stats} />
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
        <ToastProvider>
            {session === undefined && <p className="p-6 text-sm text-neutral-500">Yüklənir...</p>}
            {session === null && <LoginScreen onLoggedIn={setSession} />}
            {session && <AuthenticatedApp session={session} onLogout={logout} />}
        </ToastProvider>
    );
}
