import { LocaleProvider } from './i18n/LocaleContext.jsx';
import { useRouter } from './lib/useRouter.js';
import SiteShell from './layout/SiteShell.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import HomePage from './pages/HomePage.jsx';
import CataloguePage from './pages/CataloguePage.jsx';
import ArtworkDetailPage from './pages/ArtworkDetailPage.jsx';
import ArtistsPage from './pages/ArtistsPage.jsx';
import ArtistDetailPage from './pages/ArtistDetailPage.jsx';

const PAGES = {
    home: HomePage,
    catalogue: CataloguePage,
    'artwork-detail': ArtworkDetailPage,
    artists: ArtistsPage,
    'artist-detail': ArtistDetailPage,
    exhibitions: PlaceholderPage,
    'exhibition-detail': PlaceholderPage,
    articles: PlaceholderPage,
    'article-detail': PlaceholderPage,
    'static-page': PlaceholderPage,
    'not-found': NotFoundPage,
};

function RoutedApp() {
    const { page, params } = useRouter();
    const Page = PAGES[page] || NotFoundPage;

    return (
        <SiteShell>
            <Page params={params} />
        </SiteShell>
    );
}

export default function App() {
    return (
        <LocaleProvider>
            <RoutedApp />
        </LocaleProvider>
    );
}
