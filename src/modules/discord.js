// Discord invite link analyzer
// Uses Discord's public invite API to retrieve invite metadata

import { fetchHtml, normalizeUrl } from './_helpers.js';

export default async function discord(url) {
    try {
        const parsed = normalizeUrl(url, 'https://discord.gg');
        const host = parsed?.hostname.toLowerCase();
        if (!parsed || !['discord.gg', 'discord.com', 'www.discord.com'].includes(host)) {
            return { error: 'Invalid Discord invite URL' };
        }
        const match = parsed.pathname.match(host === 'discord.gg' ? /^\/([\w-]+)\/?$/i : /^\/invite\/([\w-]+)\/?$/i);
        if (!match) return { error: 'Invalid Discord invite URL' };

        const code = match[1];
        const { error, html } = await fetchHtml(`https://discord.com/api/v9/invites/${encodeURIComponent(code)}`, {
            Accept: 'application/json',
        });
        if (error) return { error: `Discord API request failed: ${error}` };

        const json = JSON.parse(html);
        const inviter = json.inviter;
        if (!inviter) return { error: 'No inviter data in this invite (may be a vanity URL)' };

        // Discord snowflake ID to timestamp
        const snowflake = BigInt(inviter.id);
        const timestamp = Number((snowflake >> 22n) + 1420070400000n);
        const createdAt = new Date(timestamp).toISOString().replace('T', ' ').slice(0, 19);

        // Avatar URL
        let avatarUrl = null;
        if (inviter.avatar) {
            const ext = inviter.avatar.startsWith('a_') ? 'gif' : 'png';
            avatarUrl = `https://cdn.discordapp.com/avatars/${inviter.id}/${inviter.avatar}.${ext}`;
        }

        return {
            data: {
                user_id: inviter.id,
                username: inviter.username,
                name: inviter.global_name || null,
                avatar_url: avatarUrl,
                created_at: createdAt,
            }
        };
    } catch (err) {
        return { error: err.message };
    }
}
