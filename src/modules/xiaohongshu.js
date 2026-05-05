// Xiaohongshu / RED share link metadata reader
// Extracts sharer identifiers that are embedded in app-generated share URLs.

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
};

function collectParams(rawUrls) {
    const params = new Map();
    const seen = new Set();

    function addParam(key, value) {
        if (!key || value === null || value === undefined || value === '') return;
        const normalized = key.toLowerCase();
        if (!params.has(normalized)) params.set(normalized, String(value));
    }

    function addFromUrl(raw, depth = 0) {
        if (!raw || depth > 2) return;

        let decoded = String(raw);
        try { decoded = decodeURIComponent(decoded); } catch {}

        const seenKey = `${depth}:${decoded}`;
        if (seen.has(seenKey)) return;
        seen.add(seenKey);

        let parsed;
        try {
            parsed = new URL(decoded, 'https://www.xiaohongshu.com');
        } catch {
            return;
        }

        for (const [key, value] of parsed.searchParams.entries()) {
            addParam(key, value);

            const nestedKey = key.toLowerCase();
            if (['open_url', 'redirect_url', 'target_url', 'url'].includes(nestedKey)) {
                addFromUrl(value, depth + 1);
            }
        }
    }

    for (const raw of rawUrls) addFromUrl(raw);
    return params;
}

function getParam(params, key) {
    return params.get(key.toLowerCase()) || null;
}

function extractPostId(rawUrls) {
    for (const raw of rawUrls) {
        let decoded = String(raw);
        try { decoded = decodeURIComponent(decoded); } catch {}

        const match = decoded.match(/(?:explore|discovery\/item)\/([a-z0-9]+)/i);
        if (match) return match[1];
    }
    return null;
}

function parseTimestamp(value) {
    if (!value || !/^\d{10}$/.test(value)) return null;
    return new Date(Number(value) * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

export default async function xiaohongshu(url) {
    try {
        if (!/(?:xiaohongshu\.com|xhslink\.com)\//i.test(url)) {
            return { error: 'Invalid Xiaohongshu share URL' };
        }

        const rawUrls = [url];

        if (/xhslink\.com\//i.test(url)) {
            try {
                const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
                if (res.url && res.url !== url) rawUrls.push(res.url);
            } catch {
                // Short-link resolution can fail behind regional checks; direct params still work.
            }
        }

        const params = collectParams(rawUrls);
        const data = {};

        const appUid = getParam(params, 'appuid');
        if (appUid) {
            data.user_id = appUid;
            data.profile_url = `https://www.xiaohongshu.com/user/profile/${encodeURIComponent(appUid)}`;
        }

        const shareRedId = getParam(params, 'shareRedId');
        if (shareRedId) data.share_red_id = shareRedId;

        if (!data.user_id && !data.share_red_id) {
            return { error: 'Xiaohongshu URL does not include sharer identity parameters' };
        }

        const hidden = getParam(params, 'share_from_user_hidden');
        if (hidden) data.profile_sharing = hidden.toLowerCase() === 'true' ? 'Hidden' : 'Visible';

        const authorShare = getParam(params, 'author_share');
        if (authorShare) data.author_share = authorShare === '1' || authorShare.toLowerCase() === 'true';

        const shareMethod = getParam(params, 'xhsshare');
        if (shareMethod) data.share_method = shareMethod;

        const shareSource = getParam(params, 'xsec_source');
        if (shareSource) data.share_source = shareSource;

        const shareId = getParam(params, 'share_id');
        if (shareId) data.share_token = shareId;

        const sharedAt = parseTimestamp(getParam(params, 'apptime'));
        if (sharedAt) data.shared_at = sharedAt;

        const postId = extractPostId(rawUrls);
        if (postId) data.post_id = postId;

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
