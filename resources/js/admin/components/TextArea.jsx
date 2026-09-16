export default function TextArea({ label, value, onChange, error, rows = 4, ...props }) {
    return (
        <label className="block">
            {label && <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>}
            <textarea
                value={value ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
                rows={rows}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 ${error ? 'border-red-500' : 'border-neutral-300'}`}
                {...props}
            />
            {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
        </label>
    );
}
