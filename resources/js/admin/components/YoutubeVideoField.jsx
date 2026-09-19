import TextField from './TextField.jsx';

export default function YoutubeVideoField({ url, onChange, videoId, error }) {
    return (
        <div className="space-y-3">
            <TextField
                label="YouTube video linki"
                value={url}
                onChange={onChange}
                placeholder="https://www.youtube.com/watch?v=..."
                error={error}
            />
            {videoId && (
                <div className="aspect-video w-full max-w-sm overflow-hidden rounded-md bg-black">
                    <iframe
                        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                        title="YouTube video preview"
                        className="h-full w-full"
                        loading="lazy"
                        allow="encrypted-media; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            )}
        </div>
    );
}
