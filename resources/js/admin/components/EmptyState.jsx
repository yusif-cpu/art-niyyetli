export default function EmptyState({ title, body }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
            <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">{title}</p>
            {body && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{body}</p>}
        </div>
    );
}
