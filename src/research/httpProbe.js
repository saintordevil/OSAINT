const DEFAULT_TIMEOUT_MS = 25000;
const MAX_BODY_CHARS = 2_000_000;

export const USER_AGENTS = {
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

export async function fetchTextProbe(probe, options = {}) {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        maxRedirects = 6,
        transport = probe.transport || 'native',
    } = options;

    if (transport === 'tls-client' || transport === 'auto') {
        try {
            return await fetchTextProbeTlsClient(probe, { timeoutMs, maxRedirects });
        } catch (err) {
            if (transport === 'tls-client') throw err;
        }
    }

    const method = probe.method || 'GET';
    const headers = {
        'User-Agent': USER_AGENTS[probe.user_agent || 'desktop'] || USER_AGENTS.desktop,
        'Accept': probe.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(probe.headers || {}),
    };

    let url = probe.url;
    const redirects = [];
    let response = null;
    let body = '';

    for (let hop = 0; hop <= maxRedirects; hop++) {
        const res = await fetch(url, {
            method,
            headers,
            body: probe.body,
            redirect: 'manual',
            signal: AbortSignal.timeout(timeoutMs),
        });
        response = res;

        if (isRedirect(res.status)) {
            const location = res.headers.get('location');
            redirects.push({
                status: res.status,
                url,
                location,
                headers: redactHeaders(res.headers),
            });
            if (!location) break;
            url = new URL(location, url).toString();
            continue;
        }

        body = await res.text();
        if (body.length > MAX_BODY_CHARS) body = body.slice(0, MAX_BODY_CHARS);
        break;
    }

    return {
        id: probe.id,
        platform: probe.platform,
        control: probe.control || 'exact',
        label: probe.label,
        method,
        url: probe.url,
        final_url: url,
        status: response?.status || null,
        ok: response?.ok || false,
        content_type: response?.headers.get('content-type') || '',
        headers: response ? redactHeaders(response.headers) : {},
        redirects,
        body,
        transport: 'native',
    };
}

export function postJsonProbe(id, platform, url, body, label, control = 'exact') {
    return {
        id,
        platform,
        label,
        control,
        method: 'POST',
        url,
        accept: 'application/json',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };
}

export function requestSummary(result, tokenOccurrences = [], parsed = false) {
    return {
        id: result.id,
        label: result.label,
        control: result.control || 'exact',
        parsed,
        transport: result.transport || 'native',
        method: result.method,
        url: result.url,
        final_url: result.final_url,
        status: result.status,
        ok: result.ok,
        content_type: result.content_type,
        redirects: result.redirects,
        token_occurrence_count: tokenOccurrences.length,
        body_length: result.body?.length || 0,
    };
}

function isRedirect(status) {
    return status >= 300 && status < 400;
}

function redactHeaders(headers) {
    const out = {};
    for (const [key, value] of headers.entries()) {
        const lower = key.toLowerCase();
        if (lower === 'set-cookie' || lower === 'cookie' || lower === 'authorization') {
            out[key] = '[redacted]';
        } else {
            out[key] = value;
        }
    }
    return out;
}

async function fetchTextProbeTlsClient(probe, { timeoutMs, maxRedirects }) {
    const { Session, ClientIdentifier, initTLS, destroyTLS } = await import('node-tls-client');
    await initTLS();

    const session = new Session({
        clientIdentifier: probe.user_agent === 'mobile'
            ? (ClientIdentifier.safari_ios_17_0 || 'safari_ios_17_0')
            : (ClientIdentifier.chrome_131 || 'chrome_131'),
        timeout: timeoutMs,
    });

    const method = probe.method || 'GET';
    const headers = {
        'User-Agent': USER_AGENTS[probe.user_agent || 'desktop'] || USER_AGENTS.desktop,
        'Accept': probe.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(probe.headers || {}),
    };

    let url = probe.url;
    const redirects = [];
    let response = null;
    let body = '';

    try {
        for (let hop = 0; hop <= maxRedirects; hop++) {
            response = await runTlsRequest(session, method, url, {
                headers,
                body: probe.body,
                followRedirects: false,
            });

            if (isRedirect(response.status)) {
                const location = headerValue(response.headers, 'location');
                redirects.push({
                    status: response.status,
                    url,
                    location,
                    headers: redactPlainHeaders(response.headers),
                });
                if (!location) break;
                url = new URL(location, url).toString();
                continue;
            }

            body = await response.text();
            if (body.length > MAX_BODY_CHARS) body = body.slice(0, MAX_BODY_CHARS);
            break;
        }
    } finally {
        await session.close().catch(() => {});
        await destroyTLS().catch(() => {});
    }

    return {
        id: probe.id,
        platform: probe.platform,
        control: probe.control || 'exact',
        label: probe.label,
        method,
        url: probe.url,
        final_url: url,
        status: response?.status || null,
        ok: response?.ok || false,
        content_type: headerValue(response?.headers, 'content-type') || '',
        headers: response ? redactPlainHeaders(response.headers) : {},
        redirects,
        body,
        transport: 'tls-client',
    };
}

function runTlsRequest(session, method, url, options) {
    switch (method) {
        case 'POST':
            return session.post(url, options);
        case 'PUT':
            return session.put(url, options);
        case 'PATCH':
            return session.patch(url, options);
        case 'DELETE':
            return session.delete(url, options);
        case 'HEAD':
            return session.head(url, options);
        case 'OPTIONS':
            return session.options(url, options);
        default:
            return session.get(url, options);
    }
}

function headerValue(headers = {}, name) {
    const lower = name.toLowerCase();
    const foundKey = Object.keys(headers || {}).find(key => key.toLowerCase() === lower);
    const value = foundKey ? headers[foundKey] : undefined;
    return Array.isArray(value) ? value[0] : value || '';
}

function redactPlainHeaders(headers = {}) {
    const out = {};
    for (const [key, value] of Object.entries(headers || {})) {
        const lower = key.toLowerCase();
        out[key] = ['set-cookie', 'cookie', 'authorization'].includes(lower) ? '[redacted]' : value;
    }
    return out;
}
