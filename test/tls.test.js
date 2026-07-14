import test from 'node:test';
import assert from 'node:assert/strict';

import { createTlsDeadline, tlsFetch } from '../src/modules/_tls.js';

test('TLS redirect callers share one operation deadline', () => {
    let now = 1_000;
    const remaining = createTlsDeadline(15_000, () => now);
    assert.equal(remaining(), 15_000);
    now += 4_000;
    assert.equal(remaining(), 11_000);
    now += 11_000;
    assert.throws(() => remaining(), /timed out/i);
});

test('TLS fetch rejects cleartext and credential-confused URLs before worker startup', async () => {
    await assert.rejects(tlsFetch('http://example.com/'), /valid HTTPS/i);
    await assert.rejects(tlsFetch('https://example.com@evil.example/'), /valid HTTPS/i);
});
