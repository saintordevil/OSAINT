import { destroyTLS, fetch as nodeTlsFetch, initTLS } from 'node-tls-client';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const DEFAULT_CLIENT_IDENTIFIER = 'chrome_131';

let tlsInitPromise;
let tlsClosePromise;

async function ensureTLS() {
    if (tlsClosePromise) await tlsClosePromise;

    if (!tlsInitPromise) {
        tlsInitPromise = initTLS().catch((error) => {
            tlsInitPromise = undefined;
            throw error;
        });
    }

    return tlsInitPromise;
}

/**
 * Gracefully stops node-tls-client's worker pool after the caller has
 * finished all TLS requests. Safe to call repeatedly or before first use.
 */
export async function closeTLS() {
    if (tlsClosePromise) return tlsClosePromise;

    const initialized = tlsInitPromise;
    if (!initialized) return;

    tlsInitPromise = undefined;
    const closing = (async () => {
        try {
            await initialized;
        } catch {
            return;
        }
        await destroyTLS();
    })();
    tlsClosePromise = closing;

    try {
        await closing;
    } finally {
        if (tlsClosePromise === closing) tlsClosePromise = undefined;
    }
}

export function getHeader(headers, name) {
    if (!headers) return undefined;

    const wanted = name.toLowerCase();
    const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === wanted);
    if (!key) return undefined;

    const value = headers[key];
    return Array.isArray(value) ? value[0] : value;
}

function positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function createTlsDeadline(totalMs = DEFAULT_TIMEOUT_MS, now = Date.now) {
    const duration = positiveNumber(totalMs, DEFAULT_TIMEOUT_MS);
    const deadline = now() + duration;
    return () => {
        const remaining = Math.ceil(deadline - now());
        if (remaining <= 0) throw new Error(`TLS operation timed out after ${duration}ms`);
        return remaining;
    };
}

/**
 * Bounded node-tls-client fetch wrapper.
 *
 * node-tls-client expects TLS fingerprint and timeout settings under its
 * nested `options` object. Keeping that detail here prevents individual
 * modules from silently issuing unbounded requests with the default profile.
 */
export async function tlsFetch(url, {
    clientIdentifier = DEFAULT_CLIENT_IDENTIFIER,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
    options: sessionOptions = {},
    ...requestOptions
} = {}) {
    let parsed;
    try {
        parsed = url instanceof URL ? new URL(url.href) : new URL(String(url));
    } catch {
        throw new Error('TLS fetch requires a valid HTTPS URL');
    }
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
        throw new Error('TLS fetch requires a valid HTTPS URL');
    }

    const responseLimit = positiveNumber(maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES);
    const totalTimeout = positiveNumber(sessionOptions.timeout ?? timeoutMs, DEFAULT_TIMEOUT_MS);
    const remainingTimeout = createTlsDeadline(totalTimeout);
    await ensureTLS();
    const timeout = remainingTimeout();
    const response = await nodeTlsFetch(parsed.href, {
        ...requestOptions,
        options: {
            ...sessionOptions,
            clientIdentifier: sessionOptions.clientIdentifier ?? clientIdentifier,
            timeout,
        },
    });

    const contentLength = Number.parseInt(getHeader(response.headers, 'content-length'), 10);
    if (Number.isFinite(contentLength) && contentLength > responseLimit) {
        throw new Error(`TLS response exceeds ${responseLimit} byte limit`);
    }

    const bodyBytes = Buffer.byteLength(response.body ?? '', 'utf8');
    if (bodyBytes > responseLimit) {
        throw new Error(`TLS response exceeds ${responseLimit} byte limit`);
    }

    return response;
}
