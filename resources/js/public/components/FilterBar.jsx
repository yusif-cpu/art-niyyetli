import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';

export default function FilterBar({ artists, filters, onChange }) {
    const { locale } = useLocale();

    function update(patch) {
        onChange({ ...filters, ...patch });
    }

    return (
        <div className="mb-6 flex flex-wrap gap-3">
            <label className="flex flex-col text-sm">
                {t(locale, 'filters.artist')}
                <select value={filters.artist || ''} onChange={(e) => update({ artist: e.target.value || undefined })} className="rounded-md border border-neutral-300 px-2 py-1">
                    <option value="">{t(locale, 'filters.all')}</option>
                    {artists.map((artist) => (
                        <option key={artist.id} value={artist.id}>{artist.first_name} {artist.last_name}</option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col text-sm">
                {t(locale, 'filters.status')}
                <select value={filters.status || ''} onChange={(e) => update({ status: e.target.value || undefined })} className="rounded-md border border-neutral-300 px-2 py-1">
                    <option value="">{t(locale, 'filters.all')}</option>
                    <option value="available">{t(locale, 'artwork.available')}</option>
                    <option value="reserved">{t(locale, 'artwork.reserved')}</option>
                    <option value="sold">{t(locale, 'artwork.sold')}</option>
                </select>
            </label>

            <label className="flex flex-col text-sm">
                {t(locale, 'filters.sort')}
                <select value={filters.sort || ''} onChange={(e) => update({ sort: e.target.value || undefined })} className="rounded-md border border-neutral-300 px-2 py-1">
                    <option value="">{t(locale, 'filters.sortDefault')}</option>
                    <option value="newest">{t(locale, 'filters.sortNewest')}</option>
                    <option value="price_asc">{t(locale, 'filters.sortPriceAsc')}</option>
                    <option value="price_desc">{t(locale, 'filters.sortPriceDesc')}</option>
                </select>
            </label>

            <label className="flex flex-col text-sm">
                {t(locale, 'filters.priceMin')}
                <input type="number" value={filters.price_min || ''} onChange={(e) => update({ price_min: e.target.value || undefined })} className="w-28 rounded-md border border-neutral-300 px-2 py-1" />
            </label>

            <label className="flex flex-col text-sm">
                {t(locale, 'filters.priceMax')}
                <input type="number" value={filters.price_max || ''} onChange={(e) => update({ price_max: e.target.value || undefined })} className="w-28 rounded-md border border-neutral-300 px-2 py-1" />
            </label>
        </div>
    );
}
