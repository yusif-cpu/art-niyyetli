export class PublicApiError extends Error {
    constructor(status, message, errors) {
        super(message);
        this.status = status;
        this.errors = errors || {};
        this.isRateLimited = status === 429;
    }
}

function buildQueryString(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        query.set(key, value);
    });

    return query.toString();
}

async function parseJsonSafely(response) {
    const isJson = response.headers.get('content-type')?.includes('application/json');

    return isJson ? response.json().catch(() => null) : null;
}

export async function publicApiFetch(path, params = {}) {
    const qs = buildQueryString(params);
    const url = `/api/v1${path}${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await parseJsonSafely(response);

    if (!response.ok) {
        throw new PublicApiError(response.status, body?.message || 'Request failed.', body?.errors);
    }

    return body;
}

export async function publicApiPost(path, payload) {
    const response = await fetch(`/api/v1${path}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const body = await parseJsonSafely(response);

    if (!response.ok) {
        throw new PublicApiError(response.status, body?.message || 'Request failed.', body?.errors);
    }

    return body;
}
