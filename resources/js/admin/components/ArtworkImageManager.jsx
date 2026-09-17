import Button from './Button.jsx';
import MediaUploadButton from './MediaUploadButton.jsx';
import MediaLibraryPickerButton from './MediaLibraryPickerButton.jsx';

const TYPE_LABELS = { main: 'Əsas', detail: 'Detal', frame: 'Çərçivə', wall: 'Divarda' };

export default function ArtworkImageManager({ images, onChange }) {
    function updateRow(index, patch) {
        onChange(images.map((image, i) => (i === index ? { ...image, ...patch } : image)));
    }

    function removeRow(index) {
        onChange(images.filter((_, i) => i !== index));
    }

    function moveRow(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= images.length) return;

        const next = [...images];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next.map((image, i) => ({ ...image, sort_order: i })));
    }

    function makeMain(index) {
        onChange(images.map((image, i) => ({ ...image, is_main: i === index })));
    }

    function addImage(mediaId, previewUrl) {
        if (!mediaId) return;
        onChange([
            ...images,
            { media_id: mediaId, type: 'detail', sort_order: images.length, is_main: images.length === 0, url: previewUrl },
        ]);
    }

    return (
        <div className="space-y-3">
            {images.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Hələ heç bir şəkil əlavə edilməyib.</p>}

            <ul className="space-y-2">
                {images.map((image, index) => (
                    <li key={image.id ?? `new-${index}`} className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                        {image.url ? (
                            <img src={image.url} alt="Əsər şəkli" className="h-16 w-16 rounded object-cover" />
                        ) : (
                            <span className="flex h-16 w-16 items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400 dark:bg-neutral-800">Şəkil</span>
                        )}

                        <select
                            value={image.type}
                            onChange={(e) => updateRow(index, { type: e.target.value })}
                            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                        >
                            {Object.entries(TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>

                        {image.is_main ? (
                            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">Əsas şəkil</span>
                        ) : (
                            <button type="button" onClick={() => makeMain(index)} className="text-xs text-neutral-500 hover:underline dark:text-neutral-400">
                                Əsas şəkil et
                            </button>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                            <button type="button" disabled={index === 0} onClick={() => moveRow(index, -1)} className="text-sm disabled:opacity-30">
                                ↑
                            </button>
                            <button
                                type="button"
                                disabled={index === images.length - 1}
                                onClick={() => moveRow(index, 1)}
                                className="text-sm disabled:opacity-30"
                            >
                                ↓
                            </button>
                            <Button variant="danger" onClick={() => removeRow(index)}>
                                Sil
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>

            <div className="flex flex-wrap gap-2">
                <MediaLibraryPickerButton onSelected={addImage} />
                <MediaUploadButton label="Kompüterdən yüklə" onUploaded={addImage} />
            </div>
        </div>
    );
}
