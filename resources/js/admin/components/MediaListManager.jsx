import Button from './Button.jsx';
import MediaUploadButton from './MediaUploadButton.jsx';
import MediaLibraryPickerButton from './MediaLibraryPickerButton.jsx';

export default function MediaListManager({ items, onChange, typeOptions }) {
    function updateRow(index, patch) {
        onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    }

    function removeRow(index) {
        onChange(items.filter((_, i) => i !== index));
    }

    function moveRow(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= items.length) return;

        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next.map((item, i) => ({ ...item, sort_order: i })));
    }

    function addItem(mediaId, previewUrl) {
        if (!mediaId) return;
        onChange([
            ...items,
            { media_id: mediaId, type: typeOptions?.[0]?.value, sort_order: items.length, url: previewUrl },
        ]);
    }

    return (
        <div className="space-y-3">
            {items.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Hələ heç bir media əlavə edilməyib.</p>}

            <ul className="space-y-2">
                {items.map((item, index) => (
                    <li key={item.id ?? `new-${index}`} className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                        {item.url ? (
                            <img src={item.url} alt="" className="h-16 w-16 rounded object-cover" />
                        ) : (
                            <span className="flex h-16 w-16 items-center justify-center rounded bg-neutral-100 text-xs text-neutral-400 dark:bg-neutral-800">Media</span>
                        )}

                        {typeOptions && (
                            <select
                                value={item.type}
                                onChange={(e) => updateRow(index, { type: e.target.value })}
                                className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                            >
                                {typeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        <div className="ml-auto flex items-center gap-2">
                            <button type="button" disabled={index === 0} onClick={() => moveRow(index, -1)} className="text-sm disabled:opacity-30">
                                ↑
                            </button>
                            <button
                                type="button"
                                disabled={index === items.length - 1}
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
                <MediaLibraryPickerButton onSelected={addItem} />
                <MediaUploadButton label="Kompüterdən yüklə" onUploaded={addItem} />
            </div>
        </div>
    );
}
