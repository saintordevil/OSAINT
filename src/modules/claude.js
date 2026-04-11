// Claude shared conversation metadata reader
// Uses node-tls-client to bypass CloudFlare and hit the chat_snapshots API
// Returns the creator's display name and UUID

import { fetch as tlsFetch, initTLS } from 'node-tls-client';

let _tlsReady = false;
async function ensureTLS() {
    if (!_tlsReady) { await initTLS(); _tlsReady = true; }
}

export default async function claude(url) {
    try {
        const match = url.match(/claude\.ai\/share\/([a-f0-9-]+)/i);
        if (!match) return { error: 'Invalid Claude share URL' };

        const shareId = match[1];
        await ensureTLS();

        const res = await tlsFetch(`https://claude.ai/api/chat_snapshots/${shareId}`, {
            clientIdentifier: 'chrome_131',
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
