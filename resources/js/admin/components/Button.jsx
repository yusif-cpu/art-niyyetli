const VARIANTS = {
    primary: 'bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-400',
    secondary: 'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-100 disabled:text-neutral-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
};

export default function Button({ variant = 'primary', loading = false, children, className = '', disabled, ...props }) {
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
            {children}
        </button>
    );
}
