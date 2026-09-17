export default function StatusBadge({ active, activeLabel = 'Aktiv', inactiveLabel = 'Deaktiv' }) {
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                active
                    ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
            }`}
        >
            {active ? activeLabel : inactiveLabel}
        </span>
    );
}
