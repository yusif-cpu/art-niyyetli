import '@testing-library/jest-dom/vitest';

// jsdom does not implement matchMedia; provide a default no-preference stub so
// components/tests that read it (e.g. ThemeContext) don't crash. Individual
// tests can still override window.matchMedia for their own scenarios.
if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    });
}
