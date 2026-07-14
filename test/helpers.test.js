import test from 'node:test';
import assert from 'node:assert/strict';

import {
    extractJsonLd,
    extractJsonObjects,
    extractMeta,
    fetchHtml,
    firstJsonLdOfType,
    isUnsafeWebHost,
    normalizeUrl,
    pathParts,
} from '../src/modules/_helpers.js';

test('normalizeUrl accepts only HTTP(S) web URLs', () => {
    assert.equal(normalizeUrl('example.com/path')?.href, 'https://example.com/path');
    assert.equal(normalizeUrl('https://example.com/path')?.href, 'https://example.com/path');
    assert.equal(normalizeUrl('javascript:alert(1)'), null);
    assert.equal(normalizeUrl('data:text/plain,hello'), null);
    assert.equal(normalizeUrl('ftp://example.com/file'), null);
});

test('pathParts does not crash on malformed percent escapes', () => {
    const parsed = new URL('https://example.com/valid/%E0%A4%A/end');
    assert.deepEqual(pathParts(parsed), ['valid', '%E0%A4%A', 'end']);
});

test('metadata text decodes common named, decimal, and hexadecimal entities', () => {
    const html = '<meta name="description" content="Clipped by A &amp; B &#183; Original &#x1F4FA; &middot; Video">';
    assert.equal(extractMeta(html, 'description'), 'Clipped by A & B · Original 📺 · Video');
});

test('JSON-LD helpers flatten @graph containers', () => {
    const html = '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"OSAINT"},{"@type":"Event","name":"Test"}]}</script>';
    assert.equal(extractJsonLd(html).length, 2);
    assert.equal(firstJsonLdOfType(html, 'Event')?.name, 'Test');
});

test('balanced JSON extraction handles nested renderer objects and escaped braces', () => {
    const html = '<script>var x={"sender":{"name":"A } brace","nested":{"id":"123"}}};</script>';
    assert.deepEqual(extractJsonObjects(html, 'sender'), [{ name: 'A } brace', nested: { id: '123' } }]);
});

test('balanced JSON extraction requires the marker to be an object property key', () => {
    const html = '{"caption":"sender","decoy":{"name":"Mallory"},"sender":{"name":"Alice"}}';
    assert.deepEqual(extractJsonObjects(html, 'sender'), [{ name: 'Alice' }]);
    assert.deepEqual(extractJsonObjects('{"caption":"sender","decoy":{"name":"Mallory"}}', 'sender'), []);
});

test('fetchHtml supplies a bounded request signal', async (t) => {
    const originalFetch = globalThis.fetch;
    let capturedOptions;
    globalThis.fetch = async (_url, options) => {
        capturedOptions = options;
        return new Response('<html>ok</html>', { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await fetchHtml('https://example.com');
    assert.equal(result.html, '<html>ok</html>');
    assert.ok(capturedOptions.signal instanceof AbortSignal);
});

test('fetchHtml validates every redirect before requesting it', async (t) => {
    const originalFetch = globalThis.fetch;
    const requested = [];
    globalThis.fetch = async (url) => {
        requested.push(String(url));
        return new Response('', { status: 302, headers: { location: 'http://127.0.0.1/private' } });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await fetchHtml('https://example.com/start');
    assert.match(result.error, /unsafe|redirect/i);
    assert.deepEqual(requested, ['https://example.com/start']);
});

test('private-host checks cover trailing-dot localhost and canonical IPv4-mapped IPv6', () => {
    assert.equal(isUnsafeWebHost('localhost.'), true);
    assert.equal(isUnsafeWebHost('::ffff:7f00:1'), true);
    assert.equal(isUnsafeWebHost('127.0.0.1'), true);
    assert.equal(isUnsafeWebHost('8.8.8.8'), false);
});

test('fetchHtml rejects DNS aliases that resolve to private space', async (t) => {
    const originalFetch = globalThis.fetch;
    let requested = false;
    globalThis.fetch = async () => {
        requested = true;
        return new Response('unexpected');
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await fetchHtml('https://public-looking.example/path', {}, {
        validateDns: true,
        resolveHost: async () => [{ address: '127.0.0.1', family: 4 }],
    });
    assert.match(result.error, /public address/i);
    assert.equal(requested, false);
});

test('fetchHtml cancels abandoned redirect bodies', async (t) => {
    const originalFetch = globalThis.fetch;
    let canceled = false;
    let calls = 0;
    globalThis.fetch = async () => {
        calls++;
        if (calls === 1) {
            const body = new ReadableStream({ cancel() { canceled = true; } });
            return new Response(body, { status: 302, headers: { location: 'https://www.example.com/final' } });
        }
        return new Response('ok', { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await fetchHtml('https://example.com/start', {}, {
        allowedRedirectHosts: ['example.com', 'www.example.com'],
    });
    assert.equal(result.html, 'ok');
    assert.equal(canceled, true);
});

test('fetchHtml blocks HTTPS downgrade redirects before forwarding headers', async (t) => {
    const originalFetch = globalThis.fetch;
    const requested = [];
    globalThis.fetch = async (url, options) => {
        requested.push({ url: String(url), headers: options.headers });
        return new Response('', { status: 302, headers: { location: 'http://www.example.com/final' } });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await fetchHtml('https://example.com/start', { Authorization: 'secret-test-value' });
    assert.match(result.error, /downgrade/i);
    assert.equal(requested.length, 1);
});

test('fetchHtml strips sensitive headers on allowed cross-origin redirects', async (t) => {
    const originalFetch = globalThis.fetch;
    const requested = [];
    globalThis.fetch = async (url, options) => {
        requested.push({ url: String(url), headers: options.headers });
        if (requested.length === 1) {
            return new Response('', { status: 302, headers: { location: 'https://www.example.com/final' } });
        }
        return new Response('ok', { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await fetchHtml('https://example.com/start', {
        Authorization: 'secret-test-value',
        authorization: 'second-secret-test-value',
        Cookie: 'private-test-value',
        Referer: 'https://private.example/',
    }, { allowedRedirectHosts: ['example.com', 'www.example.com'] });
    assert.equal(result.html, 'ok');
    const secondHeaders = Object.fromEntries(
        Object.entries(requested[1].headers).map(([key, value]) => [key.toLowerCase(), value]),
    );
    assert.equal(secondHeaders.authorization, undefined);
    assert.equal(secondHeaders.cookie, undefined);
    assert.equal(secondHeaders.referer, undefined);
});

test('fetchHtml can confine redirect chains to a platform host policy', async (t) => {
    const originalFetch = globalThis.fetch;
    const requested = [];
    globalThis.fetch = async (url) => {
        requested.push(String(url));
        if (requested.length === 1) {
            return new Response('', { status: 302, headers: { location: 'https://www.example.com/final' } });
        }
        return new Response('ok', { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const allowed = await fetchHtml('https://example.com/start', {}, {
        allowedRedirectHosts: host => host === 'example.com' || host === 'www.example.com',
    });
    assert.equal(allowed.html, 'ok');
    assert.equal(requested.length, 2);

    requested.length = 0;
    globalThis.fetch = async () => new Response('', {
        status: 302,
        headers: { location: 'https://different.example/final' },
    });
    const blocked = await fetchHtml('https://example.com/start', {}, {
        allowedRedirectHosts: ['example.com', 'www.example.com'],
    });
    assert.match(blocked.error, /unexpected redirect host/i);
});
