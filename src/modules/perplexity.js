// Perplexity search thread metadata reader
// Uses node-tls-client to bypass CloudFlare TLS fingerprinting
// Extracts thread author info from the REST API

import { fetch as tlsFetch, initTLS } from 'node-tls-client';

let _tlsReady = false;

async function ensureTLS() {
    if (!_tlsReady) {
        await initTLS();
        _tlsReady = true;
    }
}

export default async function perplexity(url) {
    try {
        const match = url.match(/perplexity\.ai\/search\/([\w-]+)/i);
        if (!match) return { error: 'Invalid Perplexity search URL' };

        const slug = match[1];
        await ensureTLS();

        const res = await tlsFetch(`https://www.perplexity.ai/rest/thread/${slug}`, {
            clientIdentifier: 'chrome_131',
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            }
        });

        if (!res.ok) {
            const err = await res.text().catch(() => '');
            if (err.includes('VIEW_THREAD_NOT_ALLOWED')) {
                return { error: 'Thread is private - author has restricted access' };
            }
            if (err.includes('not a valid UUID')) {
                return { error: 'Invalid thread slug format' };
            }
            return { error: `API returned status ${res.status}` };
        }

        const json = await res.json();

        if (json.status !== 'success' || !json.entries?.length) {
            return { error: 'No thread data found' };
        }

        const entry = json.entries[0];
        const data = {};
        if (entry.author_username) data.username = entry.author_username;
        if (entry.author_image) data.avatar_url = entry.author_image;
        if (entry.author_id) data.user_id = String(entry.author_id);

        if (Object.keys(data).length === 0) {
            return { error: 'No author data in thread' };
        }

        return { data };
    } catch (err) {
        return { error: err.message };
    }
}
