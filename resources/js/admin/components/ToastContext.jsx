import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const show = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        setToasts((current) => [...current, { id, message, type }]);
        setTimeout(() => {
            setToasts((current) => current.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role="status"
                        className={`rounded-md px-4 py-2 text-sm text-white shadow-lg ${
                            toast.type === 'error' ? 'bg-red-600' : 'bg-neutral-900'
                        }`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');

    return ctx;
}
