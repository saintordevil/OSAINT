import test from 'node:test';
import assert from 'node:assert/strict';

import luma from '../src/modules/luma.js';
import partiful from '../src/modules/partiful.js';

function nextDataResponse(url, pageProps) {
    const response = new Response(
        `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps } })}</script>`,
        { status: 200, headers: { 'content-type': 'text/html' } },
    );
    Object.defineProperty(response, 'url', { value: url });
    return response;
}

test('Partiful matches an event owner ID instead of an unrelated earlier host array', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => nextDataResponse('https://partiful.com/e/event123', {
        recommendations: { hosts: [{ id: 'decoy', name: 'Unrelated Host' }] },
        event: {
            id: 'event123',
            ownerIds: ['actual-host'],
            owners: [{ id: 'actual-host' }],
        },
        hosts: [{ id: 'actual-host', name: 'Actual Host' }],
    });
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await partiful('https://partiful.com/e/event123');
    assert.equal(result.error, undefined);
    assert.equal(result.data.user_id, 'actual-host');
    assert.equal(result.data.name, 'Actual Host');
});

test('Lu.ma matches the event owner ID instead of the first host-shaped object', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => nextDataResponse('https://lu.ma/event123', {
        initialData: {
            kind: 'event',
            data: {
                event: { api_id: 'evt-123', user_api_id: 'actual-host' },
                hosts: [
                    { api_id: 'decoy', name: 'Unrelated Host' },
                    { api_id: 'actual-host', name: 'Actual Host' },
                ],
            },
        },
    });
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await luma('https://lu.ma/event123');
    assert.equal(result.error, undefined);
    assert.equal(result.data.user_id, 'actual-host');
    assert.equal(result.data.name, 'Actual Host');
});

test('Lu.ma blocks event attribution after a cross-origin redirect', async (t) => {
    const originalFetch = globalThis.fetch;
    const requested = [];
    globalThis.fetch = async (url) => {
        requested.push(String(url));
        return new Response('', {
            status: 302,
            headers: { location: 'https://evil.example/forged-event' },
        });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const result = await luma('https://lu.ma/event123');
    assert.match(result.error, /unexpected redirect host/i);
    assert.deepEqual(requested, ['https://lu.ma/event123']);
});

test('event modules preserve alternate host ID field variants', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
        if (String(url).includes('partiful.com')) {
            return nextDataResponse('https://partiful.com/e/event123', {
                event: { id: 'event123', ownerIds: ['partiful-host'] },
                hosts: [{ api_id: 'partiful-host', name: 'Partiful Host' }],
            });
        }
        return nextDataResponse('https://lu.ma/event123', {
            initialData: {
                kind: 'event',
                data: {
                    event: { api_id: 'evt-123', user_api_id: 'luma-host' },
                    hosts: [{ user_api_id: 'luma-host', name: 'Luma Host' }],
                },
            },
        });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const partifulResult = await partiful('https://partiful.com/e/event123');
    assert.equal(partifulResult.data?.user_id, 'partiful-host');

    const lumaResult = await luma('https://lu.ma/event123');
    assert.equal(lumaResult.data?.user_id, 'luma-host');
});
