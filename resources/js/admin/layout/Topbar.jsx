import Button from '../components/Button.jsx';

export default function Topbar({ user, onLogout, onOpenSidebar }) {
    return (
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
            <button
                type="button"
                onClick={onOpenSidebar}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm md:hidden"
                aria-label="Menyunu aç"
            >
                ☰
            </button>
            <div className="ml-auto flex items-center gap-4">
                <span className="text-sm text-neutral-600">{user.username}</span>
                <Button variant="secondary" onClick={onLogout}>
                    Çıxış
                </Button>
            </div>
        </header>
    );
}
