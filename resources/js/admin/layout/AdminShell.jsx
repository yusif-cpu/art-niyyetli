import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AdminShell({ user, current, onNavigate, onLogout, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isAdministrator = user.roles?.includes('administrator');

    return (
        <div className="flex min-h-screen">
            <Sidebar
                current={current}
                onNavigate={onNavigate}
                isAdministrator={isAdministrator}
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <div className="flex min-h-screen flex-1 flex-col">
                <Topbar user={user} onLogout={onLogout} onOpenSidebar={() => setSidebarOpen(true)} />
                <main className="flex-1 p-4 md:p-6">{children}</main>
            </div>
        </div>
    );
}
