#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildBaseProbes, buildYoutubeInnertubeProbes, defaultYoutubeConfig, SAMPLE_URLS, spotifyBundleNeedles } from '../src/research/collectors.js';
import { buildControls, compareControlPresence } from '../src/research/controls.js';
import { fetchTextProbe, requestSummary } from '../src/research/httpProbe.js';
import { classifyCandidates } from '../src/research/classifyCandidate.js';
import { scanHtml } from '../src/research/htmlExtract.js';
import { scanJson, scanTextForTokens, tryParseJson } from '../src/research/jsonScan.js';
import { extractTokens, inferPlatform, safeUrl } from '../src/research/tokenUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
        printHelp();
        return;
    }

    if (args.selfTest) {
        await runSelfTest();
        return;
    }

    if (!args.url && !args.har) {
        throw new Error('Provide --url or --har. Use --help for examples.');
    }

    const platform = args.platform || inferPlatform(args.url || 'https://example.com');
    if (!platform || !['youtube', 'spotify'].includes(platform)) {
        throw new Error('Use --platform youtube or --platform spotify');
    }

    const result = args.har
        ? await runHarResearch({ platform, harPath: args.har, inputUrl: args.url || null, maxScripts: args.maxScripts })
        : await runUrlResearch({ platform, inputUrl: args.url, maxScripts: args.maxScripts, transport: args.transport });

    if (args.out) await writeEvidenceBundle(args.out, result);
    if (!args.quiet) console.log(JSON.stringify(result, null, 2));
}

export async function runUrlResearch({ platform, inputUrl, maxScripts = 6, transport = 'native' }) {
    const tokenInfo = extractTokens(inputUrl, platform);
    const controls = buildControls(inputUrl, platform, tokenInfo.tokens);

    const allProbeResults = [];
    const allRequests = [];
    const allCandidates = [];
    const allTokenOccurrences = [];
    const bundleMatches = [];
    let ytcfg = null;

    for (const control of controls) {
        const baseProbes = buildBaseProbes(platform, control);
        for (const probe of baseProbes) {
            const processed = await fetchAndProcessProbe(probe, tokenInfo, { transport });
            allProbeResults.push(processed);
            allRequests.push(processed.request);
            allCandidates.push(...processed.candidates);
            allTokenOccurrences.push(...processed.token_occurrences);
            if (!ytcfg && processed.artifacts?.youtube_config?.api_key) ytcfg = processed.artifacts.youtube_config;

            if (platform === 'spotify' && control.name === 'exact' && processed.artifacts?.script_urls?.length) {
                const matches = await inspectBundles(processed.artifacts.script_urls, maxScripts, transport);
                bundleMatches.push(...matches);
            }
        }

        if (platform === 'youtube') {
            const controlInfo = extractTokens(control.url, platform);
            const innertubeProbes = buildYoutubeInnertubeProbes(control.url, controlInfo.content_ids, ytcfg || defaultYoutubeConfig(), control.name);
            for (const probe of innertubeProbes) {
                const processed = await fetchAndProcessProbe(probe, tokenInfo, { transport });
                allProbeResults.push(processed);
                allRequests.push(processed.request);
                allCandidates.push(...processed.candidates);
                allTokenOccurrences.push(...processed.token_occurrences);
            }
        }
    }

    return finalizeResult({
        platform,
        inputUrl,
        tokenInfo,
        controls,
        requests: allRequests,
        candidates: allCandidates,
        tokenOccurrences: allTokenOccurrences,
        bundleMatches,
    });
}

export async function runHarResearch({ platform, harPath, inputUrl = null }) {
    const raw = await readFile(harPath, 'utf8');
    const har = JSON.parse(raw);
    const entries = har.log?.entries || har.entries || [];
    const tokenInfo = extractTokens(inputUrl || entries[0]?.request?.url || 'https://example.com', platform);
    const requests = [];
    const candidates = [];
    const tokenOccurrences = [];

    for (const [index, entry] of entries.entries()) {
        const body = decodeHarBody(entry.response?.content);
        const probeResult = {
            id: `har:${index}`,
            platform,
            control: 'har',
            label: 'HAR entry',
            method: entry.request?.method || 'GET',
            url: entry.request?.url || '',
            final_url: entry.request?.url || '',
            status: entry.response?.status || null,
            ok: entry.response?.status >= 200 && entry.response?.status < 300,
            content_type: headerFromHar(entry.response?.headers, 'content-type'),
            headers: redactHarHeaders(entry.response?.headers || []),
            redirects: [],
            body,
        };
        const processed = processProbeResult(probeResult, tokenInfo);
        requests.push(processed.request);
        candidates.push(...processed.candidates);
        tokenOccurrences.push(...processed.token_occurrences);
    }

    return finalizeResult({
        platform,
        inputUrl: inputUrl || null,
        tokenInfo,
        controls: [{ name: 'har', url: harPath, reason: 'Imported HAR' }],
        requests,
        candidates,
        tokenOccurrences,
        bundleMatches: [],
    });
}

async function fetchAndProcessProbe(probe, tokenInfo, options = {}) {
    try {
        const result = await fetchTextProbe(probe, options);
        return processProbeResult(result, tokenInfo);
    } catch (err) {
        const failed = {
            id: probe.id,
            platform: probe.platform,
            control: probe.control,
            label: probe.label,
            method: probe.method || 'GET',
            url: probe.url,
            final_url: probe.url,
            status: null,
            ok: false,
            content_type: '',
            headers: {},
            redirects: [],
            body: '',
            error: err.message,
        };
        return {
            request: { ...requestSummary(failed), error: err.message },
            candidates: [],
            token_occurrences: [],
            artifacts: {},
        };
    }
}

function processProbeResult(result, tokenInfo) {
    const tokenOccurrences = scanTextForTokens(result.body, tokenInfo.token_values)
        .map(hit => ({
            ...hit,
            snippet: redactEvidenceText(hit.snippet),
            endpoint: result.url,
            control: result.control,
            request_id: result.id,
        }));

    const parsedJson = tryParseJson(result.body);
    let parsed = false;
    let candidates = [];
    let artifacts = {};

    if (parsedJson) {
        parsed = true;
        candidates = scanJson(parsedJson, {
            endpoint: result.label || result.url,
            platform: result.platform,
            inputTokens: tokenInfo.token_values,
        });
    } else if (isHtml(result)) {
        parsed = true;
        const scanned = scanHtml(result.body, {
            endpoint: result.label || result.url,
            baseUrl: result.final_url || result.url,
            platform: result.platform,
            inputTokens: tokenInfo.token_values,
        });
        artifacts = scanned.artifacts;
        candidates = scanned.candidates;
    }

    const classified = classifyCandidates(candidates, {
        platform: result.platform,
        content_ids: tokenInfo.content_ids,
        token_dependent: false,
        public_no_auth: true,
    }).map(candidate => ({
        ...candidate,
        request_id: result.id,
        control: result.control,
    }));

    return {
        request: requestSummary(result, tokenOccurrences, parsed),
        candidates: classified,
        token_occurrences: tokenOccurrences,
        artifacts,
    };
}

async function inspectBundles(scriptUrls, maxScripts, transport = 'native') {
    const needles = spotifyBundleNeedles();
    const matches = [];
    for (const url of scriptUrls.slice(0, maxScripts)) {
        try {
            const result = await fetchTextProbe({
                id: `bundle:${matches.length}`,
                platform: 'spotify',
                control: 'exact',
                label: 'Spotify public bundle',
                url,
                accept: '*/*',
            }, { transport });
            const body = result.body || '';
            for (const needle of needles) {
                const index = body.toLowerCase().indexOf(needle.toLowerCase());
                if (index !== -1) {
                    matches.push({
                        bundle: url,
                        string: needle,
                        index,
                        snippet: body.slice(Math.max(0, index - 120), Math.min(body.length, index + needle.length + 120)),
                    });
                }
            }
        } catch {}
    }
    return matches;
}

function finalizeResult({ platform, inputUrl, tokenInfo, controls, requests, candidates, tokenOccurrences, bundleMatches }) {
    const exactCandidates = candidates.filter(c => c.control === 'exact');
    const controlCandidates = candidates.filter(c => c.control !== 'exact');
    const controlSummary = compareControlPresence(exactCandidates, controlCandidates);
    const tokenDependentCandidates = markTokenDependence(candidates, controls, requests);
    const reclassified = tokenDependentCandidates.map(candidate => ({
        ...candidate,
        classification: classifyCandidates([candidate], {
            platform,
            content_ids: tokenInfo.content_ids,
            public_no_auth: true,
            token_dependent: candidate.token_dependent,
        })[0].classification,
    }));

    const accepted = reclassified.filter(c => c.classification.accepted);
    const falsePositives = reclassified.filter(c => !c.classification.accepted && c.classification.class !== 'unknown');
    const unknown = reclassified.filter(c => c.classification.class === 'unknown');

    return {
        platform,
        input_url: inputUrl,
        tokens: tokenInfo.tokens,
        content_ids: tokenInfo.content_ids,
        result: accepted.length ? 'strict_success' : 'no_strict_sharer_found',
        reason: accepted.length
            ? 'At least one token-dependent public field was classified as strict sharer'
            : negativeReason(platform),
        identity_candidates: accepted,
        false_positive_candidates: falsePositives,
        unknown_candidates: unknown,
        token_occurrences: tokenOccurrences,
        requests,
        controls,
        control_summary: controlSummary,
        bundle_matches: bundleMatches,
        proof: accepted[0] || null,
    };
}

export function markTokenDependence(candidates, controls = [], requests = []) {
    const controlsByToken = new Map();
    const allTrackingControls = [];
    const candidateKeysByControl = new Map();
    const parsedControlsByEndpoint = new Map();

    for (const control of controls.filter(control => control.name !== 'exact')) {
        const token = tokenFromControlName(control.name);
        if (control.name === 'tracking_removed') {
            allTrackingControls.push(control.name);
        } else if (token) {
            if (!controlsByToken.has(token)) controlsByToken.set(token, []);
            controlsByToken.get(token).push(control.name);
        }
        candidateKeysByControl.set(control.name, new Set());
    }

    for (const request of requests) {
        if (request.control === 'exact' || !request.ok || !request.parsed) continue;
        const endpoint = normalizeEndpointBase(request.label || request.url);
        if (!parsedControlsByEndpoint.has(endpoint)) parsedControlsByEndpoint.set(endpoint, new Set());
        parsedControlsByEndpoint.get(endpoint).add(request.control);
    }

    for (const candidate of candidates) {
        if (candidate.control === 'exact') continue;
        if (!candidateKeysByControl.has(candidate.control)) {
            candidateKeysByControl.set(candidate.control, new Set());
        }
        candidateKeysByControl.get(candidate.control).add(candidateKey(candidate));
    }

    return candidates.map(candidate => {
        const tokenDependencies = [];
        const inconclusiveDependencies = [];
        if (candidate.control === 'exact') {
            const key = candidateKey(candidate);
            const endpoint = normalizeEndpointBase(candidate.endpoint);
            for (const [token, controlNames] of controlsByToken.entries()) {
                const comparableControls = controlNames.filter(name => parsedControlsByEndpoint.get(endpoint)?.has(name));
                if (comparableControls.length !== controlNames.length) {
                    inconclusiveDependencies.push(token);
                } else if (comparableControls.length && comparableControls.every(name => !candidateKeysByControl.get(name)?.has(key))) {
                    tokenDependencies.push(token);
                }
            }
            const comparableTrackingControls = allTrackingControls.filter(name => parsedControlsByEndpoint.get(endpoint)?.has(name));
            if (comparableTrackingControls.length !== allTrackingControls.length) {
                inconclusiveDependencies.push('all_tracking_tokens');
            } else if (comparableTrackingControls.length && comparableTrackingControls.every(name => !candidateKeysByControl.get(name)?.has(key))) {
                tokenDependencies.push('all_tracking_tokens');
            }
        }

        return {
            ...candidate,
            token_dependent: tokenDependencies.length > 0,
            token_dependencies: tokenDependencies,
            inconclusive_token_dependencies: inconclusiveDependencies,
        };
    });
}

function candidateKey(candidate) {
    return `${normalizeEndpoint(candidate.endpoint)}|${candidate.field_path}|${JSON.stringify(candidate.value)}`;
}

function normalizeEndpoint(endpoint) {
    return String(endpoint || '')
        .replace(/^(exact|[\w-]+_(?:removed|random_same_shape|one_char_mutated))\s+/i, '')
        .replace(/^(exact|[\w-]+_(?:removed|random_same_shape|one_char_mutated)):/i, '');
}

function normalizeEndpointBase(endpoint) {
    return normalizeEndpoint(endpoint).split('#')[0];
}

function tokenFromControlName(name) {
    const match = String(name || '').match(/^(.+)_(removed|random_same_shape|one_char_mutated)$/);
    return match ? match[1] : null;
}

function negativeReason(platform) {
    if (platform === 'youtube') {
        return 'Only video, channel, page, generated-share, analytics, or unknown metadata was found';
    }
    return 'Only content, owner, generated-share, analytics, navigation, or unknown metadata was found';
}

async function writeEvidenceBundle(outDir, result) {
    const dir = path.isAbsolute(outDir) ? outDir : path.join(PROJECT_ROOT, outDir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'summary.json'), JSON.stringify(result, null, 2));
    await writeFile(path.join(dir, 'requests.json'), JSON.stringify(result.requests, null, 2));
    await writeFile(path.join(dir, 'candidates.json'), JSON.stringify(result.identity_candidates.concat(result.unknown_candidates), null, 2));
    await writeFile(path.join(dir, 'false-positives.json'), JSON.stringify(result.false_positive_candidates, null, 2));
    await writeFile(path.join(dir, 'token-search.txt'), result.token_occurrences.map(hit => (
        `[${hit.control}] ${hit.endpoint}\n${redactEvidenceText(hit.snippet)}\n`
    )).join('\n'));
}

function redactEvidenceText(text) {
    return String(text || '')
        .replace(/(authorization|cookie|set-cookie)\s*[:=]\s*["']?[^"'\n\r;,}]+/gi, '$1: [redacted]')
        .replace(/"(accessToken|access_token|refreshToken|refresh_token|visitorData|VISITOR_DATA|remoteHost)"\s*:\s*"[^"]*"/g, '"$1":"[redacted]"')
        .replace(/\bBQ[A-Za-z0-9_-]{40,}\b/g, '[redacted]')
        .replace(/\b(?:SAPISIDHASH|Bearer)\s+[A-Za-z0-9._~+/=-]{16,}\b/gi, '[redacted]');
}

function isHtml(result) {
    return result.content_type.includes('html') || /^\s*<!doctype html|<html[\s>]/i.test(result.body || '');
}

function parseArgs(argv) {
    const args = { maxScripts: 6, transport: 'native' };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--help' || arg === '-h') args.help = true;
        else if (arg === '--quiet' || arg === '-q') args.quiet = true;
        else if (arg === '--self-test') args.selfTest = true;
        else if (arg === '--platform') args.platform = argv[++i];
        else if (arg === '--url') args.url = argv[++i];
        else if (arg === '--har') args.har = argv[++i];
        else if (arg === '--out') args.out = argv[++i];
        else if (arg === '--max-scripts') args.maxScripts = Number(argv[++i]);
        else if (arg === '--transport') args.transport = argv[++i];
        else if (!arg.startsWith('-') && !args.url) args.url = arg;
    }
    return args;
}

function printHelp() {
    console.log(`Usage:
  node scripts/research-share-leaks.js --platform youtube --url "https://youtu.be/..."
  node scripts/research-share-leaks.js --platform spotify --url "https://open.spotify.com/..."
  node scripts/research-share-leaks.js --platform spotify --har capture.har --url "https://open.spotify.com/..."

Options:
  --out <dir>          Write summary, requests, candidates, false positives, and token hits
  --quiet, -q          Suppress stdout when --out is used
  --max-scripts <n>    Max public Spotify bundles to inspect for strings, default 6
  --transport <mode>   native, tls-client, or auto, default native
  --self-test          Check built-in sample URL parsing`);
}

async function runSelfTest() {
    const checks = [
        ...SAMPLE_URLS.youtube.map(url => ['youtube', url]),
        ...SAMPLE_URLS.spotify.map(url => ['spotify', url]),
    ];
    for (const [platform, url] of checks) {
        const parsed = safeUrl(url);
        const inferred = inferPlatform(url);
        const tokens = extractTokens(url, platform);
        if (!parsed.hostname || inferred !== platform) throw new Error(`Failed platform inference for ${url}`);
        if (!Object.values(tokens.tokens).some(Boolean)) throw new Error(`No tokens extracted for ${url}`);
    }
    console.log(JSON.stringify({ ok: true, samples: checks.length }, null, 2));
}

function decodeHarBody(content = {}) {
    if (!content.text) return '';
    if (content.encoding === 'base64') {
        try { return Buffer.from(content.text, 'base64').toString('utf8'); } catch {}
    }
    return content.text;
}

function headerFromHar(headers = [], name) {
    return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function redactHarHeaders(headers) {
    const out = {};
    for (const header of headers) {
        const lower = header.name?.toLowerCase();
        out[header.name] = ['set-cookie', 'cookie', 'authorization'].includes(lower) ? '[redacted]' : header.value;
    }
    return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().catch(err => {
        console.error(JSON.stringify({ error: err.message }, null, 2));
        process.exit(1);
    });
}
