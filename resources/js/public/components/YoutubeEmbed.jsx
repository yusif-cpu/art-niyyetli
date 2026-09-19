export default function YoutubeEmbed({ video, title }) {
    if (!video?.embed_url) return null;

    return (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
            <iframe
                src={video.embed_url}
                title={title || 'YouTube video'}
                className="h-full w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            />
        </div>
    );
}
