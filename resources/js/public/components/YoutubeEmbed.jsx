export default function YoutubeEmbed({ video, title }) {
    if (!video?.embed_url) return null;

    return (
        // The focus ring on the frame's box while the keyboard is inside the player (the iframe itself shows none).
        <div className="aspect-video w-full overflow-hidden bg-ink outline-offset-3 outline-signal focus-within:outline-2">

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
