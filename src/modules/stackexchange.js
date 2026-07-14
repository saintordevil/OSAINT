// Stack Exchange's built-in /q/<post>/<user> and /a/<post>/<user>
// share links append the ID of the account that clicked Share. The public API
// can enrich that link-carried ID without authentication.

import { cleanText, compactData, fetchHtml, normalizeUrl } from './_helpers.js';

const EXACT_SITE_HOSTS = new Set([
    'askubuntu.com',
    'meta.askubuntu.com',
    'meta.mathoverflow.net',
    'meta.serverfault.com',
    'meta.stackexchange.com',
    'meta.stackoverflow.com',
    'meta.superuser.com',
    'mathoverflow.net',
    'serverfault.com',
    'stackapps.com',
    'superuser.com',
    'www.askubuntu.com',
    'www.mathoverflow.net',
    'www.serverfault.com',
    'www.stackapps.com',
    'www.superuser.com',
]);

const STACK_OVERFLOW_HOSTS = new Set([
    'stackoverflow.com',
    'www.stackoverflow.com',
    'es.stackoverflow.com',
    'ja.stackoverflow.com',
    'pt.stackoverflow.com',
    'ru.stackoverflow.com',
    'es.meta.stackoverflow.com',
    'ja.meta.stackoverflow.com',
    'pt.meta.stackoverflow.com',
    'ru.meta.stackoverflow.com',
]);

function isStackExchangeSite(hostname) {
    const host = hostname.toLowerCase();
    return EXACT_SITE_HOSTS.has(host)
        || STACK_OVERFLOW_HOSTS.has(host)
        || /^[a-z0-9-]+\.meta\.stackoverflow\.com$/.test(host)
        || /^[a-z0-9-]+(?:\.meta)?\.stackexchange\.com$/.test(host);
}

function isOfflineTrustedSite(hostname) {
    return EXACT_SITE_HOSTS.has(hostname) || STACK_OVERFLOW_HOSTS.has(hostname);
}

function isStackIntegerId(value) {
    return /^\d{1,10}$/.test(value || '')
        && BigInt(value) > 0n
        && BigInt(value) <= 2_147_483_647n;
}

function parseShareUrl(rawUrl) {
    const parsed = normalizeUrl(rawUrl, 'https://stackoverflow.com');
    if (!parsed || !isStackExchangeSite(parsed.hostname)) return null;

    const match = parsed.pathname.match(/^\/(q|a)\/(\d{1,10})\/(\d{1,10})\/?$/i);
    if (!match || !isStackIntegerId(match[2]) || !isStackIntegerId(match[3])) return null;

    parsed.search = '';
    parsed.hash = '';
    return {
        parsed,
        postType: match[1].toLowerCase() === 'q' ? 'question' : 'answer',
        postId: match[2],
        userId: match[3],
    };
}

async function lookupUser(userId, site) {
    const endpoint = new URL(`https://api.stackexchange.com/2.3/users/${encodeURIComponent(userId)}`);
    endpoint.searchParams.set('site', site);
    endpoint.searchParams.set('pagesize', '1');

    try {
        const { error, html } = await fetchHtml(endpoint, { Accept: 'application/json' });
        if (error || !html) return { status: 'unavailable' };

        const payload = JSON.parse(html);
        if (!Array.isArray(payload?.items)) return { status: 'unavailable' };

        const user = payload.items[0] || null;
        if (!user) return { status: 'not_found' };
        if (String(user.user_id || '') !== userId) return { status: 'not_found' };
        return { status: 'found', user };
    } catch {
        return { status: 'unavailable' };
    }
}

async function lookupPost(postType, postId, site) {
    const collection = postType === 'question' ? 'questions' : 'answers';
    const idField = postType === 'question' ? 'question_id' : 'answer_id';
    const endpoint = new URL(`https://api.stackexchange.com/2.3/${collection}/${encodeURIComponent(postId)}`);
    endpoint.searchParams.set('site', site);
    endpoint.searchParams.set('pagesize', '1');

    try {
        const { error, html } = await fetchHtml(endpoint, { Accept: 'application/json' });
        if (error || !html) return { status: 'unavailable' };

        const payload = JSON.parse(html);
        if (!Array.isArray(payload?.items)) return { status: 'unavailable' };

        const post = payload.items[0] || null;
        if (!post) return { status: 'not_found' };
        return String(post[idField] || '') === postId
            ? { status: 'found' }
            : { status: 'not_found' };
    } catch {
        return { status: 'unavailable' };
    }
}

export default async function stackexchange(url) {
    const share = parseShareUrl(url);
    if (!share) {
        return { error: 'Invalid Stack Exchange built-in share URL; expected /q/<post>/<referrer> or /a/<post>/<referrer>' };
    }

    const site = share.parsed.hostname.toLowerCase().replace(/^www\./, '');
    const [userLookup, postLookup] = await Promise.all([
        lookupUser(share.userId, site),
        lookupPost(share.postType, share.postId, site),
    ]);
    if (userLookup.status === 'not_found') {
        return { error: 'Stack Exchange referral account ID was not found by the public API' };
    }
    if (postLookup.status === 'not_found') {
        return { error: 'Stack Exchange referenced post ID was not found by the public API' };
    }
    if ((userLookup.status !== 'found' || postLookup.status !== 'found') && !isOfflineTrustedSite(site)) {
        return { error: 'Stack Exchange site, account, or post could not be validated through the public API' };
    }
    const user = userLookup.user;

    return { data: compactData({
        user_id: share.userId,
        account_id: user?.account_id != null ? String(user.account_id) : null,
        name: user?.display_name ? cleanText(user.display_name) : null,
        profile_url: user?.link,
        avatar_url: user?.profile_image,
        reputation: user?.reputation,
        user_type: user?.user_type,
        site,
        post_type: share.postType,
        post_id: share.postId,
        share_type: 'stackexchange-share',
        share_source: 'built-in-share-referrer',
        identity_role: 'referral_account',
        identity_confidence: 'unsigned_url_claim',
        account_validation: userLookup.status === 'found' ? 'api_confirmed' : 'unavailable',
        post_validation: postLookup.status === 'found' ? 'api_confirmed' : 'unavailable',
        share_url: share.parsed.toString(),
    }) };
}
