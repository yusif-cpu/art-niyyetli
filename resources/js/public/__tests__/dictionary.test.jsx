import { describe, it, expect } from 'vitest';
import { t } from '../i18n/dictionary.js';

describe('t', () => {
    it('resolves a nested key for the requested locale', () => {
        expect(t('en', 'nav.artworks')).toBe('Artworks');
        expect(t('az', 'nav.artworks')).toBe('Əsərlər');
    });

    it('falls back to az when the key is missing in the requested locale', () => {
        expect(t('en', 'nav.__missing__')).toBe(t('az', 'nav.__missing__'));
    });

    it('returns the raw path when the key is missing in both locales', () => {
        expect(t('en', 'nonexistent.key')).toBe('nonexistent.key');
    });
});
