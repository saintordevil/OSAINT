// Instagram share link metadata reader
// Extracts the SHARER's public profile from the xdt_get_relationship_for_shid_logged_out response
// Only the "sender" object in this response contains the actual sharer's identity
// The user_id in shid params and instapp:owner_user_id are the POSTER, not the sharer

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    'Accept': 'text/html',
};

export default async function instagram(url) {
    try {
        if (!/instagram\.com\/(reel|p)\//i.test(url)) {
            return { error: 'Invalid Instagram URL - must be a reel or post link' };
        }

        const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
        if (!res.ok) return { error: `Request failed with status ${res.status}` };

        const html = await res.text();
        const data = {};

        // Method 1: New format - xdt_get_relationship_for_shid_logged_out with sender object
        // This is the ONLY field that contains the actual SHARER's identity
        const xdtMatch = html.match(/"xdt_get_relationship_for_shid_logged_out"\s*:\s*\{[^}]*"sender"\s*:\s*(\{[^}]+\})/);
        if (xdtMatch) {
            try {
                const fixed = xdtMatch[1].replace(/\\\//g, '/');
                const sender = JSON.parse(fixed);
                if (sender.username) {
                    data.username = sender.username;
                    data.profile_url = `https://www.instagram.com/${sender.username}/`;
                }
                if (sender.id) data.user_id = String(sender.id);
                if (sender.full_name) data.name = sender.full_name;
                if (sender.profile_pic_url) {
                    data.avatar_url = decodeURIComponent(sender.profile_pic_url.replace(/\\u0026/g, '&'));
                }
            } catch { /* JSON parse failed */ }
        }

        // Method 2: Legacy format - user_for_shid_logged_out (older Instagram pages)
        if (Object.keys(data).length === 0) {
            const shidMatch = html.match(/"user_for_shid_logged_out"\s*:\s*(\{[^}]+\})/);
            if (shidMatch) {
                try {
                    const user = JSON.parse(shidMatch[1]);
                    if (user.username) {
                        data.username = user.username;
                        data.profile_url = `https://www.instagram.com/${user.username}/`;
                    }
                    if (user.pk || user.id) data.user_id = String(user.pk || user.id);
                    if (user.full_name) data.name = user.full_name;
                    if (user.profile_pic_url) {
                        data.avatar_url = decodeURIComponent(user.profile_pic_url);
                    }
                } catch {}
            }
        }

        // If we still have nothing, the sharer's data wasn't included by Instagram
        // Note: owner_user_id and shid user_id are the POSTER, not the sharer
        if (Object.keys(data).length === 0) {
            return { error: 'Instagram did not include sharer profile data for this link - this varies per share and is controlled server-side' };
        }

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
