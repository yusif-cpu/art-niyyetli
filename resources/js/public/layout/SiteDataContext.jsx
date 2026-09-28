import { createContext, useContext } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { getNavigation } from '../services/navigation.js';
import { getSiteSettings } from '../services/siteSettings.js';
import { listSocialLinks } from '../services/socialLinks.js';

const SiteDataContext = createContext(null);

/**
 * Fetches the data every page shell needs — navigation, site settings, social links — once per locale
 * and shares it with the Header and the Footer, which used to request the same three endpoints each.
 * The endpoints stay separate; each resource has its own { data, meta, loading, error }, so one failing
 * does not affect the others. Must be rendered inside a LocaleProvider.
 */
export function SiteDataProvider({ children }) {
    const { locale } = useLocale();
    const navigation = useApiData(() => getNavigation(locale), [locale]);
    const settings = useApiData(() => getSiteSettings(locale), [locale]);
    const socialLinks = useApiData(() => listSocialLinks(locale), [locale]);

    return (
        <SiteDataContext.Provider value={{ navigation, settings, socialLinks }}>
            {children}
        </SiteDataContext.Provider>
    );
}

export function useSiteData() {
    const ctx = useContext(SiteDataContext);
    if (!ctx) throw new Error('useSiteData must be used within a SiteDataProvider');

    return ctx;
}

/** The site settings (E14) from the shared shell data, or null outside a provider or while they load. */
export function useSiteSettings() {
    return useContext(SiteDataContext)?.settings?.data ?? null;
}

/**
 * The profile link of an artwork's artist, from the `artist.slug` the API sends (S3, resolved). No slug (an inactive
 * artist, or one without an AZ slug) means no link: the caller renders the name as plain text. No extra request.
 */
export function useArtistHref(artist) {
    return artist?.slug ? `/artists/${encodeURIComponent(artist.slug)}` : null;
}
