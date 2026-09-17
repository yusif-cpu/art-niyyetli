export default function Card({ header, footer, children, className = '' }) {
    return (
        <div className={`rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
            {header && <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">{header}</div>}
            <div className="p-4">{children}</div>
            {footer && <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">{footer}</div>}
        </div>
    );
}
