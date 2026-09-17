export default function Toggle({ checked, onChange, label }) {
    return (
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <span
                role="switch"
                aria-checked={checked}
                onClick={() => onChange?.(!checked)}
                className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-green-600' : 'bg-neutral-300 dark:bg-neutral-700'}`}
            >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </span>
            {label && <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>}
        </label>
    );
}
