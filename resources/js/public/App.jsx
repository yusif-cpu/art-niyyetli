import { LocaleProvider } from './i18n/LocaleContext.jsx';
import { useRouter } from './lib/useRouter.js';
import SiteShell from './layout/SiteShell.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const PAGES = {
    home: PlaceholderPage,
    catalogue: PlaceholderPage,
    'artwork-detail': PlaceholderPage,
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
