const STYLES = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
};

export default function Banner({ type = 'error', children }) {
    if (!children) return null;

    return <div className={`rounded-md border px-4 py-2 text-sm ${STYLES[type]}`}>{children}</div>;
}
