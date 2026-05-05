// Baidu Netdisk share link metadata reader
// Old Baidu Pan share URLs expose the sharer's public UK in the query string.

function collectParams(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        parsed = new URL(rawUrl, 'https://pan.baidu.com');
    }

    const params = new Map();
    for (const [key, value] of parsed.searchParams.entries()) {
        if (value !== '') params.set(key.toLowerCase(), value);
    }

    return { parsed, params };
}

function isSupportedShareUrl(parsed) {
    const host = parsed.hostname.toLowerCase();
    return host === 'pan.baidu.com' && /^\/share\/link\/?$/i.test(parsed.pathname);
}

function getParam(params, key) {
    return params.get(key.toLowerCase()) || null;
}

export default async function baidu(url) {
    try {
        const { parsed, params } = collectParams(url);
        if (!isSupportedShareUrl(parsed)) {
            return { error: 'Invalid Baidu Netdisk share URL' };
        }

        const uk = getParam(params, 'uk');

        if (!uk || !/^\d+$/.test(uk)) {
            return { error: 'Baidu Netdisk URL does not include a sharer UK' };
        }

        const data = {
            user_id: uk,
            profile_url: `https://pan.baidu.com/share/home?uk=${uk}`,
        };

        const shareId = getParam(params, 'shareid');
        if (shareId) data.share_id = shareId;

        const fileId = getParam(params, 'fid');
        if (fileId) data.file_id = fileId;

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
