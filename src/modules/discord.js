// Discord invite link analyzer
// Uses Discord's public invite API to retrieve invite metadata

export default async function discord(url) {
    try {
        const match = url.match(/(?:discord\.com\/invite|discord\.gg)\/([\w-]+)/i);
        if (!match) return { error: 'Invalid Discord invite URL' };

        const code = match[1];
        const res = await fetch(`https://discord.com/api/v9/invites/${code}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        if (!res.ok) return { error: `Discord API returned ${res.status}` };

        const json = await res.json();
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
