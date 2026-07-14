import test from 'node:test';
import assert from 'node:assert/strict';

import onedrive from '../src/modules/onedrive.js';
import partiful from '../src/modules/partiful.js';

function responseAt(url, body) {
    const response = new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
    Object.defineProperty(response, 'url', { value: url });
    return response;
}

test('1drv.ms short links resolve before extracting the owner CID', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => responseAt(
        'https://onedrive.live.com/?cid=8B0BEBB4F44D58BB&id=8B0BEBB4F44D58BB%21108516',
        '<html></html>',
    );
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await onedrive('https://1drv.ms/u/s!synthetic');
    assert.equal(result.error, undefined);
    assert.equal(result.data.user_id, '8B0BEBB4F44D58BB');
});

test('modern 1drv.ms /c/ links expose their owner CID without following redirects', async (t) => {
    const originalFetch = globalThis.fetch;
    let requested = false;
    globalThis.fetch = async () => {
        requested = true;
        throw new Error('modern path should parse offline');
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await onedrive('https://1drv.ms/w/c/8B0BEBB4F44D58BB/resource-token?e=opaque');
    assert.equal(result.error, undefined);
    assert.equal(result.data.user_id, '8B0BEBB4F44D58BB');
    assert.equal(requested, false);
});

test('bare OneDrive owner-container URLs are not treated as shares', async () => {
    const result = await onedrive('https://onedrive.live.com/?cid=8B0BEBB4F44D58BB');
    assert.match(result.error, /share URL/i);
});

test('bare hexadecimal OneDrive id values are not treated as resource shares', async () => {
    const result = await onedrive('https://onedrive.live.com/?id=DEADBEEF');
    assert.match(result.error, /share URL/i);
});

test('OneDrive falls back to a valid cid when id is a non-CID resource path', async () => {
    const result = await onedrive('https://onedrive.live.com/?id=%2Fpersonal%2Ffile&cid=8B0BEBB4F44D58BB');
    assert.equal(result.error, undefined);
    assert.equal(result.data.user_id, '8B0BEBB4F44D58BB');
});

test('go.partiful.com short links resolve before event and host parsing', async (t) => {
    const originalFetch = globalThis.fetch;
    const payload = JSON.stringify({ props: { pageProps: { event: {
        owners: [{ id: 'user-123', name: 'Alice' }],
    } } } });
    globalThis.fetch = async () => responseAt(
        'https://partiful.com/e/event123',
        `<script id="__NEXT_DATA__" type="application/json">${payload}</script>`,
    );
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await partiful('https://go.partiful.com/synthetic');
    assert.equal(result.error, undefined);
    assert.equal(result.data.event_id, 'event123');
    assert.equal(result.data.user_id, 'user-123');
});
