import test from 'node:test';
import assert from 'node:assert/strict';

import tiktok, { selectTikTokShareUser } from '../src/modules/tiktok.js';

test('TikTok selects the verified share envelope over an unrelated owner decoy', () => {
    const html = `<script>${JSON.stringify({
        shareUser: { id: 'owner-id', uniqueId: 'content_owner' },
        'webapp.reflow.global.shareUser': {
            statusCode: 0,
            shareUser: { id: 'sharer-id', uniqueId: 'actual_sharer' },
        },
    })}</script>`;

    const selected = selectTikTokShareUser(html);
    assert.equal(selected.statusCode, 0);
    assert.equal(selected.user.id, 'sharer-id');
    assert.equal(selected.user.uniqueId, 'actual_sharer');
});

test('TikTok rejects cleartext share URLs before starting TLS work', async () => {
    const result = await tiktok('http://vm.tiktok.com/example/');
    assert.match(result.error, /Invalid TikTok/i);
});
