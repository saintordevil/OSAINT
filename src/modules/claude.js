// Claude shared conversation metadata reader
// Uses node-tls-client to bypass CloudFlare and hit the chat_snapshots API
// Returns the creator's display name and UUID

import { tlsFetch } from './_tls.js';
import { normalizeUrl } from './_helpers.js';

const CLAUDE_HOSTS = new Set(['claude.ai', 'www.claude.ai']);

export function parseClaudeShareUrl(url) {
    const parsed = normalizeUrl(url, 'https://claude.ai');
    if (!parsed || parsed.protocol !== 'https:' || !CLAUDE_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    const match = parsed.pathname.match(/^\/share\/([a-f0-9-]+)\/?$/i);
    return match?.[1] || null;
}

export default async function claude(url, { fetchTls = tlsFetch } = {}) {
    try {
        const shareId = parseClaudeShareUrl(url);
        if (!shareId) return { error: 'Invalid Claude share URL' };

        const res = await fetchTls(`https://claude.ai/api/chat_snapshots/${shareId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': `https://claude.ai/share/${shareId}`,
            },
        });

        if (!res.ok) return { error: `API returned status ${res.status}` };

        const json = await res.json();
        const data = {};

        if (json.created_by) data.name = json.created_by;
        if (json.creator?.full_name) data.name = json.creator.full_name;
        if (json.creator?.uuid) data.user_id = json.creator.uuid;

        if (Object.keys(data).length === 0) {
            return { error: 'No creator info found in snapshot' };
        }

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
