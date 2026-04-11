// Telegram joinchat link decoder
// Decodes the base64 invite hash to extract the creator's numeric ID
// No HTTP request needed - pure local decoding

export default async function telegram(url) {
    try {
        const match = url.match(/t\.me\/joinchat\/([\w_-]+)/i);
        if (!match) return { error: 'Invalid Telegram joinchat URL format' };

        let hash = match[1];

        // Add base64 padding if needed
        while (hash.length % 4 !== 0) hash += '=';

        // Base64url decode
        const b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
        const buf = Buffer.from(b64, 'base64');

        if (buf.length < 4) return { error: 'Hash too short to decode' };

        // First 4 bytes = little-endian uint32 creator ID
        const creatorId = buf.readUInt32LE(0);

        if (creatorId === 0) {
            return { error: 'This invite link does not contain creator data (ID=0)' };
        }

        return { data: { user_id: creatorId } };
    } catch (err) {
        return { error: err.message };
    }
}
