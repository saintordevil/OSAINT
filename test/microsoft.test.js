import test from 'node:test';
import assert from 'node:assert/strict';

import microsoft from '../src/modules/microsoft.js';

test('SharePoint personal slugs are preserved and email reconstruction is labeled heuristic', async () => {
    const result = await microsoft('https://tenant.sharepoint.com/:f:/g/personal/john_doe_contoso_com/abc');
    assert.equal(result.error, undefined);
    assert.deepEqual(result.data, {
        site_slug: 'john_doe_contoso_com',
        email_candidate: 'john.doe@contoso.com',
        email_confidence: 'heuristic',
        identity_confidence: 'unsigned_url_claim',
    });
    assert.equal(Object.hasOwn(result.data, 'email'), false);
});

test('SharePoint parser rejects lookalike hosts and unrelated paths', async () => {
    assert.match((await microsoft('https://evil.example/?next=https://tenant.sharepoint.com/:f:/g/personal/john_doe_contoso_com/abc')).error, /SharePoint/i);
    assert.match((await microsoft('https://tenant.sharepoint.com/sites/example')).error, /SharePoint|identity/i);
});

test('SharePoint shorter /p/ personal-share links preserve the UPN-derived slug', async () => {
    const result = await microsoft('https://contoso-my.sharepoint.com/:w:/p/john_contoso_com/share-token');
    assert.equal(result.error, undefined);
    assert.equal(result.data.site_slug, 'john_contoso_com');
    assert.equal(result.data.email_confidence, 'heuristic');
});
