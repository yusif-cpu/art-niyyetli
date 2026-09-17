import Header from './Header.jsx';
import Footer from './Footer.jsx';

export default function SiteShell({ children }) {
    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}
