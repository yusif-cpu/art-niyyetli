import Button from './Button.jsx';

export default function Pagination({ meta, onPageChange }) {
    if (!meta || meta.last_page <= 1) return null;

    return (
        <div className="mt-4 flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
            <span>
                {meta.current_page} / {meta.last_page} səhifə ({meta.total} nəticə)
            </span>
            <div className="flex gap-2">
                <Button
                    variant="secondary"
                    disabled={meta.current_page <= 1}
                    onClick={() => onPageChange(meta.current_page - 1)}
                >
                    Əvvəlki
                </Button>
                <Button
                    variant="secondary"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => onPageChange(meta.current_page + 1)}
                >
                    Növbəti
                </Button>
            </div>
        </div>
    );
}
