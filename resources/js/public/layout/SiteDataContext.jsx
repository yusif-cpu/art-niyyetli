import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { getNavigation } from '../services/navigation.js';
import { getSiteSettings } from '../services/siteSettings.js';
import { listSocialLinks } from '../services/socialLinks.js';
import { listArtists } from '../services/artists.js';

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

    // TEMPORARY (S3): the artist id → slug index, fetched only when a screen asks for it (useArtistHref), once per
    // locale — pages that never need it keep the three shell requests.
    const [artistIndexWanted, setArtistIndexWanted] = useState(false);
    const artistIndex = useApiData(() => (artistIndexWanted ? listArtists(locale) : Promise.resolve(null)), [locale, artistIndexWanted]);
    const requestArtistIndex = useCallback(() => setArtistIndexWanted(true), []);

    return (
        <SiteDataContext.Provider value={{ navigation, settings, socialLinks, artistIndex, requestArtistIndex }}>
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
 * The profile link of an artwork's artist.
 * TEMPORARY WORKAROUND for S3 — the artwork payload's `artist` is { id, name } with no slug (ArtworkCardResource).
 * When the backend adds `artist.slug`, the first branch takes over; then delete everything below it in this hook,
 * plus artistIndex / requestArtistIndex in SiteDataProvider above. Nothing else depends on them.
 * Returns null while unknown or when the artist is not in the public list (inactive / no AZ slug): render plain text.
 */
export function useArtistHref(artist) {
    const { artistIndex, requestArtistIndex } = useSiteData();
    const needsIndex = Boolean(artist && !artist.slug && artist.id != null);

    useEffect(() => {
        if (needsIndex) requestArtistIndex();
    }, [needsIndex, requestArtistIndex]);

    if (!artist) return null;
    if (artist.slug) return `/artists/${encodeURIComponent(artist.slug)}`;

    const match = Array.isArray(artistIndex.data) ? artistIndex.data.find((a) => a.id === artist.id) : null;

    return match?.slug ? `/artists/${encodeURIComponent(match.slug)}` : null;
}
