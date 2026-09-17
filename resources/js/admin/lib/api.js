export class ApiError extends Error {
    constructor(status, message, errors) {
        super(message);
        this.status = status;
        this.errors = errors || {};
    }
}

function readCookie(name) {
    const match = document.cookie.split('; ').find((row) => row.startsWith(name + '='));

    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export async function apiFetch(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = { Accept: 'application/json', ...options.headers };

    if (method !== 'GET' && method !== 'HEAD') {
        const token = readCookie('XSRF-TOKEN');
        if (token) {
            headers['X-XSRF-TOKEN'] = token;
        }
    }

    let body = options.body;
    if (body instanceof FormData) {
        // Let the browser set the multipart Content-Type (with boundary) itself.
    } else if (body && typeof body === 'object') {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    const response = await fetch('/admin' + path, {
        method,
        headers,
        body,
        credentials: 'same-origin',
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
        throw new ApiError(response.status, data?.message || 'Request failed.', data?.errors);
    }

    return data;
}
