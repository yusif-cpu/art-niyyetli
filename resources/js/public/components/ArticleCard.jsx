import ImageWithFallback from './ImageWithFallback.jsx';

export default function ArticleCard({ article }) {
    const mediaUrl = article.media?.[0]?.url ?? null;

    return (
        <a href={`/articles/${article.slug}`} className="block">
            <ImageWithFallback src={mediaUrl} alt={article.title} className="aspect-video w-full object-cover" />
            <p className="mt-2 text-sm font-medium">{article.title}</p>
            <p className="text-sm text-neutral-500">{article.short_text}</p>
        </a>
    );
}
