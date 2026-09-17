import Button from '../components/Button.jsx';
import { useTheme } from '../components/ThemeContext.jsx';

export default function Topbar({ user, onLogout, onOpenSidebar }) {
    const { theme, toggle } = useTheme();

    return (
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <button
                type="button"
                onClick={onOpenSidebar}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm md:hidden dark:border-neutral-700 dark:text-neutral-100"
                aria-label="Menyunu aç"
            >
                ☰
            </button>
            <div className="ml-auto flex items-center gap-4">
                <span className="text-sm text-neutral-600 dark:text-neutral-300">{user.username}</span>
                <button
                    type="button"
                    onClick={toggle}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:text-neutral-100"
                    aria-label="Tema dəyiş"
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                <Button variant="secondary" onClick={onLogout}>
                    Çıxış
                </Button>
            </div>
        </header>
    );
}
