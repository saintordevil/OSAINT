#!/usr/bin/env node

// ─── OSAINT ──────────────────────────────────────────────────────────────────
// Share Link Intelligence - Reveal public metadata behind share links

import { printBanner, printTargetBox, printResults, printError, printPlatformList, printHelp, printCommands, printHowTo } from './src/banner.js';
import { getSpinner, runStep, resetSteps } from './src/spinner.js';
import { detectPlatform, listPlatforms, loadParser } from './src/router.js';
import { C, G, R, DG, DIM, W, RST, SHOW } from './src/colors.js';

// ─── ARGS ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {
    json:     args.includes('--json')     || args.includes('-j'),
    quiet:    args.includes('--quiet')    || args.includes('-q'),
    list:     args.includes('--list')     || args.includes('-l'),
    test:     args.includes('--test'),
    help:     args.includes('--help')     || args.includes('-h'),
    banner:   args.includes('--banner'),
    commands: args.includes('--commands') || args.includes('--cmd'),
    howto:    args.includes('--howto')    || args.includes('--how'),
    setBanner: args.find(a => a.startsWith('--set-banner='))?.split('=')[1],
};
const url = args.find(a => !a.startsWith('-'));

// ─── CLEANUP ─────────────────────────────────────────────────────────────────

function cleanup() {
    const s = getSpinner();
    s.stop();
    process.stdout.write(SHOW);
}
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('uncaughtException', (err) => { cleanup(); printError(err.message); process.exit(1); });

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
    const s = getSpinner();

    if (flags.setBanner) {
        const { setBannerStyle, getBannerStyleNames } = await import('./src/banner.js');
        const names = getBannerStyleNames();
        const num = parseInt(flags.setBanner);
        if (isNaN(num) || num < 1 || num > names.length) {
            console.log(`\n   ${R}Invalid style.${RST} Pick 1-${names.length}:\n`);
            names.forEach((n, i) => console.log(`   ${C}${i + 1}${RST}  ${W}${n}${RST}`));
            console.log('');
            return;
        }
        setBannerStyle(num);
        console.log(`\n   ${C}>>>${RST} ${W}Banner set to Style ${num}: ${names[num - 1]}${RST}\n`);
        printBanner();
        return;
    }

    if (flags.banner) {
        const { showBannerPreviews } = await import('./src/banner.js');
        showBannerPreviews();
        return;
    }

    if (flags.commands) {
        printBanner();
        printCommands();
        return;
    }

    if (flags.howto) {
        printBanner();
        printHowTo();
        return;
    }

    if (flags.help) {
        if (!flags.quiet) printBanner();
        printHelp();
        return;
    }

    if (flags.list) {
        if (!flags.quiet) printBanner();
        printPlatformList(listPlatforms());
        return;
    }

    if (flags.test) {
        await selfTest();
        return;
    }

    if (!url) {
        if (!flags.quiet) printBanner();
        printError('No URL provided. Use --help for usage.');
        return;
    }

    // ── Analysis pipeline ────────────────────────────────────────────────

    if (!flags.quiet && !flags.json) printBanner();

    // Detect platform first (quick, no spinner needed)
    const platform = detectPlatform(url);
    if (!platform) {
        printError('Unsupported URL. Use --list to see supported platforms.');
        return;
    }

    // Show target info before spinner starts
    if (!flags.json) {
        printTargetBox(platform.name, url);
    }

    // Start spinner - all steps animate together from here
    s.reset();

    // Step 1: Load module
    const parser = await runStep(`Loading ${platform.name} module`, async () => {
        const p = await loadParser(platform.name);
        if (!p) throw new Error(`No parser found for ${platform.name}`);
        return p;
    });

    // Step 2: Analyze
    const result = await runStep(`Analyzing ${platform.name} share link`, async () => {
        return await parser(url);
    });

    // Step 3: Process
    if (result.error) {
        s.fail('Analysis returned an error', result.error);
        // Let rain animate on the completed lines for a moment
        await new Promise(r => setTimeout(r, 1500));
        s.stop();
        console.log('');
        printError(result.error);
        return;
    }

    await runStep('Processing results', async () => {}, { doneMsg: 'Analysis complete' });

    // Let rain animate on all completed lines for a good while
    s.idle('');
    await new Promise(r => setTimeout(r, 2500));

    // Stop spinner, print results
    s.stop();
    console.log('');

    // Output
    if (flags.json) {
        console.log(JSON.stringify(result.data, null, 2));
    } else {
        printResults(result.data, platform.name);
    }
}

// ─── SELF TEST ───────────────────────────────────────────────────────────────

async function selfTest() {
    printBanner();
    const s = getSpinner();
    const platformCount = listPlatforms().length;

    s.reset();

    // Test 1: Router
    await runStep('Testing URL router', async () => {
        const tests = [
            ['https://vm.tiktok.com/abc123/',            'tiktok'],
            ['https://www.instagram.com/reel/abc123/',   'instagram'],
            ['https://discord.gg/abc123',                'discord'],
            ['https://www.perplexity.ai/search/query',   'perplexity'],
            ['https://x-my.sharepoint.com/:f:/g/personal/a_b_c_com/x', 'microsoft'],
            ['https://pin.it/abc123',                    'pinterest'],
            ['https://x.substack.com/@user/note/1?r=a',  'substack'],
            ['https://suno.com/s/abc-123',               'suno'],
            ['https://t.me/joinchat/AAAAAAA',            'telegram'],
            ['https://clips.twitch.tv/TestClipSlug',     'twitch'],
            ['https://reddit.com/r/test/s/abc123',       'reddit'],
        ];
        let pass = 0;
        for (const [u, expected] of tests) {
            const r = detectPlatform(u);
            if (r?.name === expected) pass++;
        }
        if (pass !== tests.length) throw new Error(`${pass}/${tests.length} passed`);
    }, { doneMsg: `Router: all ${platformCount} patterns matched` });

    // Test 2: Module loading
    await runStep('Loading all modules', async () => {
        const platforms = listPlatforms();
        let loaded = 0;
        for (const p of platforms) {
            const parser = await loadParser(p.name);
            if (parser) loaded++;
        }
        if (loaded !== platforms.length) throw new Error(`${loaded}/${platforms.length} loaded`);
    }, { doneMsg: `Modules: all ${platformCount} loaded` });

    // Test 3: Offline parsers
    await runStep('Testing offline parsers', async () => {
        const tg = await loadParser('telegram');
        const tgR = await tg('https://t.me/joinchat/AQAAAA');
        if (!tgR.data && !tgR.error) throw new Error('Telegram decoder failed');

        const ms = await loadParser('microsoft');
        const msR = await ms('https://x-my.sharepoint.com/:f:/g/personal/john_doe_contoso_com/abc');
        if (msR.data?.email !== 'john.doe@contoso.com') throw new Error('Microsoft parser failed');
    }, { doneMsg: 'Offline parsers: Telegram + Microsoft OK' });

    // Let all completed lines rain together
    s.idle('');
    await new Promise(r => setTimeout(r, 2500));
    s.stop();

    console.log('');
    console.log(`   ${C}>>>${RST} ${G}All tests passed${RST}`);
    console.log('');
}

// ─── RUN ─────────────────────────────────────────────────────────────────────

main().catch(err => {
    cleanup();
    printError(err.message);
    process.exit(1);
});
