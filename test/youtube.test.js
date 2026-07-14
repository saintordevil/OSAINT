import test from 'node:test';
import assert from 'node:assert/strict';

import youtube from '../src/modules/youtube.js';

test('YouTube clips extract the clip creator renderer without inventing a profile URL', async (t) => {
    const originalFetch = globalThis.fetch;
    let capturedOptions;
    globalThis.fetch = async (_url, options) => {
        capturedOptions = options;
        return new Response(`<!doctype html><script>
            var data = {"clipAttributionRenderer":{
                "clipAuthor":{"simpleText":"Futium"},
                "authorAvatar":{"thumbnails":[
                    {"url":"https://yt3.ggpht.com/avatar-small","width":24,"height":24},
                    {"url":"https://yt3.ggpht.com/avatar-large","width":48,"height":48}
                ]},
                "clipTitle":{"simpleText":"Test Clip"},
                "createdText":{"simpleText":"2 years ago"},
                "viewCountText":{"simpleText":"1,234 views"}
            }};
        </script>`, { status: 200 });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const input = 'https://www.youtube.com/clip/UgkxU2HSeGL_NvmDJ-nQJrlLwllwMDBdGZFs';
    const result = await youtube(input);

    assert.equal(result.error, undefined);
    assert.deepEqual(result.data, {
        clip_id: 'UgkxU2HSeGL_NvmDJ-nQJrlLwllwMDBdGZFs',
        share_type: 'clip',
        identity_role: 'clip_creator',
        name: 'Futium',
        clip_title: 'Test Clip',
        created_text: '2 years ago',
        view_count: '1,234 views',
        avatar_url: 'https://yt3.ggpht.com/avatar-large',
        share_url: input,
    });
    assert.equal(Object.hasOwn(result.data, 'profile_url'), false);
    assert.ok(capturedOptions.signal instanceof AbortSignal);
});

test('normal YouTube share tokens remain explicitly unsupported', async () => {
    const result = await youtube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=example');
    assert.match(result.error, /do not expose sharer data/i);
});
