export default function PageHeader({ title, actions }) {
    return (
        <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h1>
            {actions && <div className="flex gap-2">{actions}</div>}
        </div>
    );
}
