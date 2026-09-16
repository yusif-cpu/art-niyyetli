export default function EmptyState({ title, body }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 px-6 py-16 text-center">
            <p className="text-base font-medium text-neutral-700">{title}</p>
            {body && <p className="mt-1 text-sm text-neutral-500">{body}</p>}
        </div>
    );
}
