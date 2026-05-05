import { mutateToken, randomLike, removeParam, setParam } from './tokenUtils.js';

export function buildControls(rawUrl, platform, tokens) {
    const controls = [
        {
            name: 'exact',
            url: rawUrl,
            reason: 'Original user-supplied URL',
        },
    ];

    const params = trackingTokenParams(tokens, platform);
    if (!params.length) return controls;

    if (params.length > 1) {
        controls.push({
            name: 'tracking_removed',
            url: params.reduce((url, param) => removeParam(url, paramToUrlName(param)), rawUrl),
            reason: 'All known tracking tokens removed',
        });
    }

    for (const param of params) {
        const token = tokens[param];
        controls.push({
            name: `${param}_removed`,
            url: removeParam(rawUrl, paramToUrlName(param)),
            reason: `${param} token removed`,
        });

        const random = randomLike(token);
        if (random) {
            controls.push({
                name: `${param}_random_same_shape`,
                url: setParam(rawUrl, paramToUrlName(param), random),
                reason: `${param} replaced with a same-length random token`,
            });
        }

        const mutated = mutateToken(token);
        if (mutated && mutated !== token) {
            controls.push({
                name: `${param}_one_char_mutated`,
                url: setParam(rawUrl, paramToUrlName(param), mutated),
                reason: `${param} one-character token mutation`,
            });
        }
    }

    return controls;
}

function trackingTokenParams(tokens, platform) {
    const order = platform === 'youtube'
        ? ['si', 'pp']
        : ['si', 'sp_cid', 'dlsi', 'branch_referrer', 'branch_match_id'];
    return order.filter(param => tokens[param]);
}

function paramToUrlName(param) {
    if (param === 'branch_referrer') return '_branch_referrer';
    if (param === 'branch_match_id') return '_branch_match_id';
    return param;
}

export function compareControlPresence(exactCandidates, controlCandidates) {
    const exactKeys = new Set(exactCandidates.map(candidateKey));
    const controlKeys = new Set(controlCandidates.map(candidateKey));
    return {
        exact_count: exactCandidates.length,
        control_count: controlCandidates.length,
        exact_unique_count: [...exactKeys].filter(k => !controlKeys.has(k)).length,
        shared_count: [...exactKeys].filter(k => controlKeys.has(k)).length,
    };
}

function candidateKey(candidate) {
    return `${normalizeEndpoint(candidate.endpoint)}|${candidate.field_path}|${JSON.stringify(candidate.value)}`;
}

function normalizeEndpoint(endpoint) {
    return String(endpoint || '')
        .replace(/^(exact|[\w-]+_(?:removed|random_same_shape|one_char_mutated))\s+/i, '')
        .replace(/^(exact|[\w-]+_(?:removed|random_same_shape|one_char_mutated)):/i, '');
}
