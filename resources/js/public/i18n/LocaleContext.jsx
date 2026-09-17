import { createContext, useContext, useState } from 'react';

const LocaleContext = createContext(null);
const STORAGE_KEY = 'public-locale';

function resolveInitialLocale() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'az' || stored === 'en') return stored;
    } catch {
        // localStorage unavailable (private browsing, storage blocked, etc.) — fall back to default.
    }

    return 'az';
}

export function LocaleProvider({ children }) {
    const [locale, setLocaleState] = useState(resolveInitialLocale);

    function setLocale(next) {
        setLocaleState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // localStorage unavailable — locale still changes for this session, just isn't persisted.
        }
    }

    return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
    const ctx = useContext(LocaleContext);
    if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');

    return ctx;
}
