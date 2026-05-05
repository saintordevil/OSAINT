// NetEase Cloud Music share link metadata reader
// App share URLs can include userid, which maps to the sharing account.

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json,text/html',
    'Referer': 'https://music.163.com/',
};

function isNeteaseHost(hostname) {
    return hostname === 'music.163.com' || hostname === 'y.music.163.com';
}

function parseUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        parsed = new URL(rawUrl, 'https://music.163.com');
    }

    if (!isNeteaseHost(parsed.hostname.toLowerCase())) return null;
    return parsed;
}

function collectParams(parsed) {
    const params = new Map();

    function add(key, value) {
        if (!key || value === null || value === undefined || value === '') return;
        const normalized = key.toLowerCase();
        if (!params.has(normalized)) params.set(normalized, String(value));
    }

    for (const [key, value] of parsed.searchParams.entries()) add(key, value);

    if (parsed.hash) {
        const hash = parsed.hash.replace(/^#/, '');
        const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
        for (const [key, value] of new URLSearchParams(query).entries()) add(key, value);
    }

    return params;
}

function getParam(params, key) {
    return params.get(key.toLowerCase()) || null;
}

async function fetchProfile(userId) {
    try {
        const res = await fetch(`https://music.163.com/api/v1/user/detail/${encodeURIComponent(userId)}`, {
            headers: HEADERS,
        });
        if (!res.ok) return {};

        const body = await res.json();
        const profile = body.profile || {};
        const data = {};

        if (profile.nickname) data.name = profile.nickname;
        if (profile.avatarUrl) data.avatar_url = profile.avatarUrl;
        if (profile.signature) data.signature = profile.signature;
        if (typeof profile.followeds === 'number') data.follower_count = profile.followeds;
        if (typeof profile.follows === 'number') data.following_count = profile.follows;
        if (typeof body.listenSongs === 'number') data.listened_songs = body.listenSongs;

        return data;
    } catch {
        return {};
    }
}

export default async function netease(url) {
    try {
        const parsed = parseUrl(url);
        if (!parsed) {
            return { error: 'Invalid NetEase Cloud Music share URL' };
        }

        const params = collectParams(parsed);
        const userId = getParam(params, 'userid');

        if (!userId || !/^\d+$/.test(userId)) {
            return { error: 'NetEase URL does not include a sharer userid' };
        }

        const data = {
            user_id: userId,
            profile_url: `https://music.163.com/#/user/home?id=${userId}`,
        };

        const contentId = getParam(params, 'id');
        if (contentId) data.content_id = contentId;

        const creatorId = getParam(params, 'creatorId');
        if (creatorId && creatorId !== userId) data.content_creator_id = creatorId;

        const dlt = getParam(params, 'dlt');
        if (dlt) data.share_token = dlt;

        return { data: { ...data, ...(await fetchProfile(userId)) } };
    } catch (err) {
        return { error: err.message };
    }
}
