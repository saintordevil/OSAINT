// Zhihu legacy share link metadata reader
// Some old app shares used utm_member as a base64-encoded profile slug.

function parseUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        parsed = new URL(rawUrl, 'https://www.zhihu.com');
    }

    const host = parsed.hostname.toLowerCase();
    if (host !== 'zhihu.com' && !host.endsWith('.zhihu.com')) return null;
    if (!/^\/(?:question\/\d+|answer\/\d+|p\/\d+|zvideo\/\d+)(?:[/?]|$)/i.test(parsed.pathname)) return null;
    return parsed;
}

function decodeMember(value) {
    if (!value) return null;

    let decodedParam = value;
    try { decodedParam = decodeURIComponent(value); } catch {}

    try {
        const raw = Buffer.from(decodedParam, 'base64').toString('utf8').trim();
        if (/^[a-f0-9]{32}$/i.test(raw)) return raw;
    } catch {}

    return null;
}

export default async function zhihu(url) {
    try {
        const parsed = parseUrl(url);
        if (!parsed) {
            return { error: 'Invalid Zhihu share URL' };
        }

        const member = decodeMember(parsed.searchParams.get('utm_member'));
        if (!member) {
            return { error: 'Zhihu URL does not include a legacy sharer member slug' };
        }

        return {
            data: {
                user_id: member,
                profile_url: `https://www.zhihu.com/people/${member}`,
                share_method: 'legacy utm_member',
                identity_confidence: 'unsigned_url_claim',
            },
        };
    } catch (err) {
        return { error: err.message };
    }
}
