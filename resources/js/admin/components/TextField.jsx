export default function TextField({ label, value, onChange, error, type = 'text', ...props }) {
    return (
        <label className="block">
            {label && <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>}
            <input
                type={type}
                value={value ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
                className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-400 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-600 ${error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'}`}
                {...props}
            />
            {error && <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{error}</span>}
        </label>
    );
}
