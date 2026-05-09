#!/usr/bin/env node

// ─── OSAINT ──────────────────────────────────────────────────────────────────
// Share Link Intelligence - Reveal public metadata behind share links

import { printBanner, printTargetBox, printResults, printError, printPlatformList, printHelp, printCommands, printHowTo, displayName } from './src/banner.js';
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
    animations: args.includes('--animations') || args.includes('--anim'),
    commands: args.includes('--commands') || args.includes('--cmd'),
    howto:    args.includes('--howto')    || args.includes('--how'),
    setBanner:  args.find(a => a.startsWith('--set-banner='))?.split('=')[1],
    setLoading: args.find(a => a.startsWith('--set-loading='))?.split('=')[1],
    setIdle:    args.find(a => a.startsWith('--set-idle='))?.split('=')[1],
    animDemo:   args.find(a => a.startsWith('--anim-demo='))?.split('=')[1],
};
const url = args.find(a => !a.startsWith('-'));

// ─── CLEANUP ─────────────────────────────────────────────────────────────────

function cleanup() {
    const s = getSpinner();
    s.stop();
    process.stdout.write(SHOW);
}

function printJson(payload) {
    console.log(JSON.stringify(payload, null, 2));
}

function outputError(message) {
    if (flags.json) {
        printJson({ error: message });
    } else {
        printError(message);
    }
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

    if (flags.setLoading) {
        const { setLoadingAnimation, getAnimationCount, getAnimationNames } = await import('./src/animations.js');
        const count = getAnimationCount();
        const num = parseInt(flags.setLoading);
        if (isNaN(num) || num < 1 || num > count) {
            console.log(`\n   ${R}Invalid animation.${RST} Pick 1-${count}. Run ${W}--animations${RST} to see all.\n`);
            return;
        }
        setLoadingAnimation(num);
        const names = getAnimationNames();
        console.log(`\n   ${C}>>>${RST} ${W}Loading animation set to ${num}: ${names[num - 1]}${RST}\n`);
        return;
    }

    if (flags.setIdle) {
        const { setIdleAnimation, getAnimationCount, getAnimationNames } = await import('./src/animations.js');
        const count = getAnimationCount();
        const num = parseInt(flags.setIdle);
        if (isNaN(num) || num < 1 || num > count) {
            console.log(`\n   ${R}Invalid animation.${RST} Pick 1-${count}. Run ${W}--animations${RST} to see all.\n`);
            return;
        }
        setIdleAnimation(num);
        const names = getAnimationNames();
        console.log(`\n   ${C}>>>${RST} ${W}Idle animation set to ${num}: ${names[num - 1]}${RST}\n`);
        return;
    }

    if (flags.animDemo) {
        const { demoAnimation, getAnimationCount } = await import('./src/animations.js');
        const count = getAnimationCount();
        const num = parseInt(flags.animDemo);
        if (isNaN(num) || num < 1 || num > count) {
            console.log(`\n   ${R}Invalid animation.${RST} Pick 1-${count}. Run ${W}--animations${RST} to see all.\n`);
            return;
        }
        await demoAnimation(num);
        return;
    }

    if (flags.animations) {
        const { showAnimationPreviews } = await import('./src/animations.js');
        showAnimationPreviews();
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
        if (!flags.quiet && !flags.json) printBanner();
        outputError('No URL provided. Use --help for usage.');
        return;
    }

    // ── Analysis pipeline ────────────────────────────────────────────────

    if (!flags.quiet && !flags.json) printBanner();

    // Detect platform first (quick, no spinner needed)
    const platform = detectPlatform(url);
    if (!platform) {
        outputError('Unsupported URL. Use --list to see supported platforms.');
        return;
    }

    if (flags.json) {
        const parser = await loadParser(platform.name);
        const result = await parser(url);
        printJson(result.error ? { error: result.error } : result.data);
        return;
    }

    // Show target info before spinner starts
    printTargetBox(platform.name, url);

    // Start spinner - all steps animate together from here
    s.reset();

    // Step 1: Load module
    const pName = displayName(platform.name);
    const parser = await runStep(`Loading ${pName} module`, async () => {
        const p = await loadParser(platform.name);
        if (!p) throw new Error(`No parser found for ${pName}`);
        return p;
    });

    // Step 2: Analyze
    const result = await runStep(`Analyzing ${pName} share link`, async () => {
        return await parser(url);
    });

    // Step 3: Process
    if (result.error) {
        s.stop();
        console.log('');
        outputError(result.error);
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
    printResults(result.data, platform.name);
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
            ['https://www.xiaohongshu.com/explore/abc123?appuid=671e6b46000000001d021e13', 'xiaohongshu'],
            ['https://www.bilibili.com/video/BV1xx411c7mD/?mid=123456', 'bilibili'],
            ['https://pan.baidu.com/share/link?shareid=123&uk=456', 'baidu'],
            ['https://music.163.com/song/27971936/?userid=132726004', 'netease'],
            ['https://www.zhihu.com/question/123?utm_member=YzA1N2VkNTNiYTMyMmMwZDdiODYxYmI0NDRiOWZlYTY%3D', 'zhihu'],
            ['https://discord.gg/abc123',                'discord'],
            ['https://claude.ai/share/abcd-1234-efgh',   'claude'],
            ['https://www.perplexity.ai/search/query',   'perplexity'],
            ['https://x-my.sharepoint.com/:f:/g/personal/a_b_c_com/x', 'microsoft'],
            ['https://pin.it/abc123',                    'pinterest'],
            ['https://x.substack.com/@user/note/1?r=a',  'substack'],
            ['https://suno.com/s/abc-123',               'suno'],
            ['https://www.spotify.com/wrapped-share/0123456789abcdef0123456789abcdef', 'spotify'],
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

    // Test 3: Strict parsers
    await runStep('Testing strict parsers', async () => {
        const tg = await loadParser('telegram');
        const tgR = await tg('https://t.me/joinchat/AQAAAA');
        if (!tgR.data && !tgR.error) throw new Error('Telegram decoder failed');

        const ms = await loadParser('microsoft');
        const msR = await ms('https://x-my.sharepoint.com/:f:/g/personal/john_doe_contoso_com/abc');
        if (msR.data?.email !== 'john.doe@contoso.com') throw new Error('Microsoft parser failed');

        const xhs = await loadParser('xiaohongshu');
        const xhsR = await xhs('https://www.xiaohongshu.com/explore/abc123?appuid=671e6b46000000001d021e13&share_from_user_hidden=true&xhsshare=CopyLink');
        if (xhsR.data?.user_id !== '671e6b46000000001d021e13') throw new Error('Xiaohongshu parser failed');

        const bili = await loadParser('bilibili');
        const biliR = await bili('https://www.bilibili.com/video/BV1xx411c7mD/?mid=123456&share_session_id=abc');
        if (biliR.data?.user_id !== '123456') throw new Error('Bilibili parser failed');
        const biliProfile = await bili('https://space.bilibili.com/999?mid=123456');
        if (!biliProfile.error) throw new Error('Bilibili strict negative failed');
        const biliLookalike = await bili('https://www.notbilibili.com/video/BV1xx411c7mD/?mid=123456');
        if (!biliLookalike.error) throw new Error('Bilibili host negative failed');

        const baidu = await loadParser('baidu');
        const baiduR = await baidu('https://pan.baidu.com/share/link?shareid=123&uk=456');
        if (baiduR.data?.user_id !== '456') throw new Error('Baidu parser failed');
        const baiduHome = await baidu('https://pan.baidu.com/share/home?uk=456');
        if (!baiduHome.error) throw new Error('Baidu strict negative failed');
        const baiduLookalike = await baidu('https://evilpan.baidu.com/share/link?shareid=123&uk=456');
        if (!baiduLookalike.error) throw new Error('Baidu host negative failed');

        const netease = await loadParser('netease');
        const neteaseR = await netease('https://music.163.com/song/27971936/?userid=132726004');
        if (neteaseR.data?.user_id !== '132726004') throw new Error('NetEase parser failed');
        const neteaseNoUser = await netease('https://music.163.com/song/27971936/?id=27971936');
        if (!neteaseNoUser.error) throw new Error('NetEase strict negative failed');

        const zhihu = await loadParser('zhihu');
        const zhihuR = await zhihu('https://www.zhihu.com/question/123?utm_member=YzA1N2VkNTNiYTMyMmMwZDdiODYxYmI0NDRiOWZlYTY%3D');
        if (zhihuR.data?.user_id !== 'c057ed53ba322c0d7b861bb444b9fea6') throw new Error('Zhihu parser failed');
        const zhihuBad = await zhihu('https://www.zhihu.com/question/123?utm_member=bad');
        if (!zhihuBad.error) throw new Error('Zhihu strict negative failed');
    }, { doneMsg: 'Strict parsers: Telegram + Microsoft + Xiaohongshu + Bilibili + Baidu + NetEase + Zhihu OK' });

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
    outputError(err.message);
    process.exit(1);
});
