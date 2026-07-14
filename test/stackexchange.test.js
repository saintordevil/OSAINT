import test from 'node:test';
import assert from 'node:assert/strict';

import stackexchange from '../src/modules/stackexchange.js';
import { detectPlatform } from '../src/router.js';

test('Stack Exchange built-in share links resolve the appended referral account through the public API', async (t) => {
    const originalFetch = globalThis.fetch;
    const requestedUrls = [];
    globalThis.fetch = async (url) => {
        const requestedUrl = String(url);
        requestedUrls.push(requestedUrl);
        const items = requestedUrl.includes('/users/') ? [{
                user_id: 819887,
                account_id: 999,
                display_name: 'A &amp; B',
                link: 'https://stackoverflow.com/users/819887/example',
                profile_image: 'https://example.com/avatar.png',
                reputation: 1234,
                user_type: 'registered',
            }] : [{ question_id: 123456 }];
        return new Response(JSON.stringify({ items }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const input = 'https://stackoverflow.com/q/123456/819887';
    const result = await stackexchange(input);

    assert.equal(result.error, undefined);
    assert.deepEqual(result.data, {
        user_id: '819887',
        account_id: '999',
        name: 'A & B',
        profile_url: 'https://stackoverflow.com/users/819887/example',
        avatar_url: 'https://example.com/avatar.png',
        reputation: 1234,
        user_type: 'registered',
        site: 'stackoverflow.com',
        post_type: 'question',
        post_id: '123456',
        share_type: 'stackexchange-share',
        share_source: 'built-in-share-referrer',
        identity_role: 'referral_account',
        identity_confidence: 'unsigned_url_claim',
        account_validation: 'api_confirmed',
        post_validation: 'api_confirmed',
        share_url: input,
    });
    assert.equal(requestedUrls.length, 2);
    assert.ok(requestedUrls.some(requestedUrl => /^https:\/\/api\.stackexchange\.com\/2\.3\/users\/819887\?/.test(requestedUrl)));
    assert.ok(requestedUrls.some(requestedUrl => /^https:\/\/api\.stackexchange\.com\/2\.3\/questions\/123456\?/.test(requestedUrl)));
    assert.ok(requestedUrls.every(requestedUrl => /site=stackoverflow\.com/.test(requestedUrl)));
});

test('Stack Exchange keeps the embedded referral ID when optional API enrichment is unavailable', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('offline'); };
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await stackexchange('https://superuser.com/a/98765/42');
    assert.equal(result.error, undefined);
    assert.equal(result.data.user_id, '42');
    assert.equal(result.data.post_type, 'answer');
    assert.equal(result.data.identity_role, 'referral_account');
    assert.equal(result.data.account_validation, 'unavailable');
    assert.equal(result.data.post_validation, 'unavailable');
});

test('Stack Exchange rejects a referral account ID that the API confirms does not exist', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
    });
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await stackexchange('https://stackoverflow.com/q/1/2147483647');
    assert.match(result.error, /not found/i);
});

test('Stack Exchange rejects a nonexistent post even when the referral account exists', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => new Response(JSON.stringify({
        items: String(url).includes('/users/') ? [{ user_id: 819887 }] : [],
    }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
    });
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await stackexchange('https://stackoverflow.com/q/2147483647/819887');
    assert.match(result.error, /post ID was not found/i);
});

test('Stack Exchange rejects IDs outside the API signed 32-bit integer range', async () => {
    assert.match((await stackexchange('https://stackoverflow.com/q/999999999999/819887')).error, /built-in share URL/i);
    assert.equal(detectPlatform('https://stackoverflow.com/q/999999999999/819887'), null);
});

test('Stack Exchange treats mismatched API objects as confirmed validation failures', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => new Response(JSON.stringify({
        items: String(url).includes('/users/')
            ? [{ user_id: 819887 }]
            : [{ question_id: 123 }],
    }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
    });
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await stackexchange('https://stackoverflow.com/q/999/819887');
    assert.match(result.error, /post ID was not found/i);
});

test('Stack Exchange routing is exact and rejects owner-style or embedded lookalike URLs', async () => {
    assert.equal(detectPlatform('https://stackoverflow.com/q/123456/819887')?.name, 'stackexchange');
    assert.equal(detectPlatform('https://www.stackoverflow.com/q/123456/819887')?.name, 'stackexchange');
    assert.equal(detectPlatform('meta.stackexchange.com/a/123456/42')?.name, 'stackexchange');
    assert.equal(detectPlatform('https://meta.serverfault.com/q/1/2')?.name, 'stackexchange');
    assert.equal(detectPlatform('https://meta.superuser.com/q/1/2')?.name, 'stackexchange');
    assert.equal(detectPlatform('https://meta.askubuntu.com/q/1/2')?.name, 'stackexchange');
    assert.equal(detectPlatform('https://meta.mathoverflow.net/q/1/2')?.name, 'stackexchange');
    assert.equal(detectPlatform('https://www.mathoverflow.net/q/1/2')?.name, 'stackexchange');
    assert.equal(detectPlatform('https://es.meta.stackoverflow.com/q/1/2')?.name, 'stackexchange');
    assert.equal(detectPlatform('https://agents.meta.stackoverflow.com/q/1/2')?.name, 'stackexchange');
    assert.equal(detectPlatform('https://meta.es.stackoverflow.com/q/1/2'), null);
    assert.equal(detectPlatform('https://garbage.stackoverflow.com/q/1/2'), null);
    assert.equal(detectPlatform('https://evil.example/?next=https://stackoverflow.com/q/1/2'), null);

    assert.match((await stackexchange('https://stackoverflow.com/questions/123/title')).error, /built-in share/i);
    assert.match((await stackexchange('https://stackoverflow.com.evil.example/q/1/2')).error, /Stack Exchange/i);
});

test('unrecognized Stack Exchange network subdomains require API validation', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({
        error_id: 400,
        error_name: 'bad_parameter',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await stackexchange('https://garbage.stackexchange.com/q/1/2');
    assert.match(result.error, /validated/i);
});
