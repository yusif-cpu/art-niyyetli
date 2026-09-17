import { LocaleProvider } from './i18n/LocaleContext.jsx';
import { useRouter } from './lib/useRouter.js';
import SiteShell from './layout/SiteShell.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import HomePage from './pages/HomePage.jsx';
import CataloguePage from './pages/CataloguePage.jsx';
import ArtworkDetailPage from './pages/ArtworkDetailPage.jsx';

const PAGES = {
    home: HomePage,
    catalogue: CataloguePage,
    'artwork-detail': ArtworkDetailPage,
    artists: PlaceholderPage,
    'artist-detail': PlaceholderPage,
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
