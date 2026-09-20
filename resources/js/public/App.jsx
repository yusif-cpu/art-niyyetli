import { LocaleProvider } from './i18n/LocaleContext.jsx';
import { useRouter } from './lib/useRouter.js';
import { SiteDataProvider } from './layout/SiteDataContext.jsx';
import SiteShell from './layout/SiteShell.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import HomePage from './pages/HomePage.jsx';
import CataloguePage from './pages/CataloguePage.jsx';
import ArtworkDetailPage from './pages/ArtworkDetailPage.jsx';
import ArtistsPage from './pages/ArtistsPage.jsx';
import ArtistDetailPage from './pages/ArtistDetailPage.jsx';
import ExhibitionsPage from './pages/ExhibitionsPage.jsx';
import ExhibitionDetailPage from './pages/ExhibitionDetailPage.jsx';
import ArticlesPage from './pages/ArticlesPage.jsx';
import ArticleDetailPage from './pages/ArticleDetailPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import StaticPage from './pages/StaticPage.jsx';

const PAGES = {
    home: HomePage,
    catalogue: CataloguePage,
    'artwork-detail': ArtworkDetailPage,
    artists: ArtistsPage,
    'artist-detail': ArtistDetailPage,
    exhibitions: ExhibitionsPage,
    'exhibition-detail': ExhibitionDetailPage,
    articles: ArticlesPage,
    'article-detail': ArticleDetailPage,
    contact: ContactPage,
    'static-page': StaticPage,
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
            <SiteDataProvider>
                <RoutedApp />
            </SiteDataProvider>
        </LocaleProvider>
    );
}
