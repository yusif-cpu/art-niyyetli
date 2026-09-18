import { useLocale } from '../i18n/LocaleContext.jsx';
import { t } from '../i18n/dictionary.js';
import ImageWithFallback from './ImageWithFallback.jsx';

export default function ArtworkCard({ artwork }) {
    const { locale } = useLocale();
    const imageAlt = artwork.artist?.name ? `${artwork.title} by ${artwork.artist.name}` : artwork.title;

    return (
        <a href={`/artworks/${artwork.inventory_code}`} className="block">
            <ImageWithFallback src={artwork.image_url} alt={imageAlt} className="aspect-square w-full object-cover" />
            <p className="mt-2 text-sm font-medium">{artwork.title}</p>
            <p className="text-sm text-neutral-500">{artwork.artist?.name}</p>
            <p className="text-sm">
                {artwork.price != null ? `${artwork.price} ${artwork.currency}` : t(locale, 'artwork.priceOnRequest')}
            </p>
            {artwork.availability !== 'available' && (
                <p className="text-xs uppercase text-neutral-500">{t(locale, `artwork.${artwork.availability}`)}</p>
            )}
        </a>
    );
}
