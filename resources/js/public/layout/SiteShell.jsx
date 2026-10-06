import Header from './Header.jsx';
import Footer from './Footer.jsx';
import PageLoadingIndicator from './PageLoadingIndicator.jsx';

export default function SiteShell({ children }) {
    return (
        // min-h-dvh (dynamic viewport height): phone browsers measure the plain viewport-height unit with their
        // toolbars hidden, so a page sized by it runs under the address bar.
        <div className="flex min-h-dvh flex-col">
            <PageLoadingIndicator />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}
