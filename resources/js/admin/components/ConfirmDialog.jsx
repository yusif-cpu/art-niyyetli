import Button from './Button.jsx';

export default function ConfirmDialog({ open, title, body, confirmLabel = 'Təsdiqlə', onConfirm, onCancel }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-neutral-900">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
                {body && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{body}</p>}
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onCancel}>
                        Ləğv et
                    </Button>
                    <Button variant="danger" onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
