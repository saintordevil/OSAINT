import { isIdentityPath } from './classifyCandidate.js';

const MAX_VALUE_LENGTH = 500;

export function scanJson(value, options = {}) {
    const {
        endpoint = 'unknown',
        platform = null,
        inputTokens = [],
        maxCandidates = 500,
    } = options;

    const candidates = [];
    walk(value, '$', null);
    return candidates.slice(0, maxCandidates);

    function walk(node, path, parent) {
        if (candidates.length >= maxCandidates) return;
        if (node === null || node === undefined) return;

        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) walk(node[i], `${path}[${i}]`, node);
            return;
        }

        if (typeof node === 'object') {
            for (const [key, child] of Object.entries(node)) {
                const childPath = `${path}.${key}`;
                if (isIdentityPath(childPath) || tokenNearValue(child, inputTokens)) {
                    candidates.push({
                        platform,
                        endpoint,
                        field_path: childPath,
                        value: summarizeValue(child, childPath),
                        nearby_object: summarizeObject(node),
                        token_distance_bytes: estimateTokenDistance(child, node, inputTokens),
                    });
                }
                walk(child, childPath, node);
            }
            return;
        }

        if (isIdentityPath(path) || tokenNearValue(node, inputTokens)) {
            candidates.push({
                platform,
                endpoint,
                field_path: path,
                value: summarizeValue(node, path),
                nearby_object: summarizeObject(parent),
                token_distance_bytes: estimateTokenDistance(node, parent, inputTokens),
            });
        }
    }
}

export function scanTextForTokens(text, tokens = []) {
    const haystack = String(text || '');
    const occurrences = [];
    for (const token of tokens.filter(Boolean)) {
        let start = 0;
        while (true) {
            const index = haystack.indexOf(token, start);
            if (index === -1) break;
            occurrences.push({
                token,
                index,
                snippet: haystack.slice(Math.max(0, index - 80), Math.min(haystack.length, index + token.length + 80)),
            });
            start = index + token.length;
            if (occurrences.length > 200) return occurrences;
        }
    }
    return occurrences;
}

export function tryParseJson(text) {
    if (!text || typeof text !== 'string') return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

export function summarizeValue(value, keyPath = '') {
    if (value === null || value === undefined) return value;
    if (isSensitiveKey(keyPath)) return '[redacted]';
    if (typeof value === 'object') return summarizeObject(value);
    const text = String(value);
    if (looksLikeBearerToken(text)) return '[redacted]';
    return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}...` : value;
}

export function summarizeObject(value) {
    if (!value || typeof value !== 'object') return value;
    const out = {};
    for (const [key, child] of Object.entries(value).slice(0, 25)) {
        if (child && typeof child === 'object') {
            out[key] = Array.isArray(child) ? `[array:${child.length}]` : '[object]';
        } else {
            out[key] = summarizeValue(child, key);
        }
    }
    return out;
}

function isSensitiveKey(keyPath) {
    const key = String(keyPath || '').toLowerCase();
    return [
        'authorization',
        'cookie',
        'set-cookie',
        'accesstoken',
        'access_token',
        'refreshtoken',
        'refresh_token',
        'clientsecret',
        'client_secret',
        'sp_dc',
        'sp_key',
        'visitordata',
        'visitor_data',
        'remotehost',
        'remote_host',
    ].some(sensitive => key.includes(sensitive));
}

function looksLikeBearerToken(value) {
    return /^Bearer\s+/i.test(value) || /^BQ[A-Za-z0-9_-]{40,}$/.test(value);
}

function tokenNearValue(value, tokens) {
    if (!tokens || tokens.length === 0) return false;
    const text = JSON.stringify(value);
    return tokens.some(token => token && text.includes(token));
}

function estimateTokenDistance(value, parent, tokens) {
    if (!tokens || tokens.length === 0) return null;
    const text = JSON.stringify(parent ?? value);
    let best = null;
    for (const token of tokens.filter(Boolean)) {
        const tokenIndex = text.indexOf(token);
        if (tokenIndex === -1) continue;
        const valueIndex = text.indexOf(String(value));
        if (valueIndex === -1) continue;
        const distance = Math.abs(tokenIndex - valueIndex);
        if (best === null || distance < best) best = distance;
    }
    return best;
}
