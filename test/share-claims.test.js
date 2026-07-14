import test from 'node:test';
import assert from 'node:assert/strict';

import bilibili from '../src/modules/bilibili.js';
import netease from '../src/modules/netease.js';
import xiaohongshu from '../src/modules/xiaohongshu.js';
import zhihu from '../src/modules/zhihu.js';
import { detectPlatform } from '../src/router.js';

test('Xiaohongshu requires a content link, appuid, and a companion app-share marker', async () => {
    const appUid = '671e6b46000000001d021e13';

    assert.match((await xiaohongshu(`https://www.xiaohongshu.com/?appuid=${appUid}&xhsshare=CopyLink`)).error, /validated app-share/i);
    assert.match((await xiaohongshu(`https://www.xiaohongshu.com/explore/abc123?appuid=${appUid}`)).error, /companion marker/i);
    assert.match((await xiaohongshu('https://www.xiaohongshu.com/explore/abc123?shareRedId=metadata-only&xhsshare=CopyLink')).error, /account ID/i);

    const result = await xiaohongshu(`https://www.xiaohongshu.com/explore/abc123?appuid=${appUid}&xhsshare=CopyLink&shareRedId=metadata-only`);
    assert.equal(result.data?.user_id, appUid);
    assert.equal(result.data?.share_red_id, 'metadata-only');
    assert.equal(result.data?.identity_confidence, 'unsigned_url_claim');
    assert.equal(detectPlatform(`https://www.xiaohongshu.com/?appuid=${appUid}&xhsshare=CopyLink`), null);
});

test('Bilibili requires a supported content path, numeric MID, and companion marker', async () => {
    assert.match((await bilibili('https://www.bilibili.com/video/BV1xx411c7mD/?mid=123456')).error, /companion marker/i);
    assert.match((await bilibili('https://space.bilibili.com/123456?mid=123456&share_session_id=abc')).error, /supported app share/i);

    const result = await bilibili('https://www.bilibili.com/video/BV1xx411c7mD/?mid=123456&share_session_id=abc');
    assert.equal(result.data?.user_id, '123456');
    assert.equal(result.data?.share_token, 'abc');
    assert.equal(result.data?.identity_confidence, 'unsigned_url_claim');
});

test('NetEase requires a content route and content ID instead of accepting userid on the home page', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ profile: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
    });
    t.after(() => { globalThis.fetch = originalFetch; });

    assert.match((await netease('https://music.163.com/?userid=132726004')).error, /supported content share/i);

    const result = await netease('https://music.163.com/song/27971936/?userid=132726004');
    assert.equal(result.data?.user_id, '132726004');
    assert.equal(result.data?.content_id, '27971936');
    assert.equal(result.data?.identity_confidence, 'unsigned_url_claim');
    assert.equal(detectPlatform('https://music.163.com/?userid=132726004'), null);
});

test('Zhihu only decodes legacy utm_member on supported content routes', async () => {
    const member = 'YzA1N2VkNTNiYTMyMmMwZDdiODYxYmI0NDRiOWZlYTY=';

    assert.match((await zhihu(`https://www.zhihu.com/?utm_member=${encodeURIComponent(member)}`)).error, /Invalid Zhihu/i);

    const result = await zhihu(`https://www.zhihu.com/question/123?utm_member=${encodeURIComponent(member)}`);
    assert.equal(result.data?.user_id, 'c057ed53ba322c0d7b861bb444b9fea6');
    assert.equal(result.data?.identity_confidence, 'unsigned_url_claim');
    assert.equal(detectPlatform(`https://www.zhihu.com/?utm_member=${encodeURIComponent(member)}`), null);
});
