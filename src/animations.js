import spinners from 'unicode-animations';
import { C, W, DG, DIM, BY, G, RST, CLR, HIDE, SHOW, visLen } from './colors.js';
import { line, row, empty } from './banner.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const CONFIG_PATH = join(__dir, '..', '.osaint-config.json');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

function loadConfig() {
    try {
        if (existsSync(CONFIG_PATH)) return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    } catch {}
    return { bannerStyle: 2 };
}

function saveConfig(cfg) {
    writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// ─── ANIMATION REGISTRY ─────────────────────────────────────────────────────
// Sources:
//   unicode-animations  — npm package (already a dependency)
//   rattles              — github.com/vyfor/rattles (frames ported from Rust)

function buildRegistry() {
    const all = [];

    // ── Unicode Animations — Classic ─────────────────────────────────────
    const uClassic = 'Unicode Animations \u00b7 Classic';
    for (const key of ['braille', 'braillewave', 'dna']) {
        all.push({ key, name: fmtName(key), category: uClassic, ...spinners[key] });
    }

    // ── Unicode Animations — Grid ────────────────────────────────────────
    const uGrid = 'Unicode Animations \u00b7 Grid';
    for (const key of [
        'scan', 'rain', 'scanline', 'pulse', 'snake', 'sparkle',
        'cascade', 'columns', 'orbit', 'breathe', 'waverows',
        'checkerboard', 'helix', 'fillsweep', 'diagswipe',
    ]) {
        all.push({ key, name: fmtName(key), category: uGrid, ...spinners[key] });
    }

    // ── Rattles — ASCII ──────────────────────────────────────────────────
    const rAscii = 'Rattles \u00b7 ASCII';
    all.push({ key: 'arc',              name: 'Arc',              category: rAscii, frames: ['\u25dc','\u25e0','\u25dd','\u25de','\u25e1','\u25df'], interval: 100 });
    all.push({ key: 'balloon',          name: 'Balloon',          category: rAscii, frames: [' ','.','\u006f','O','@','*',' '], interval: 140 });
    all.push({ key: 'circle_halves',    name: 'Circle Halves',    category: rAscii, frames: ['\u25d0','\u25d3','\u25d1','\u25d2'], interval: 120 });
    all.push({ key: 'circle_quarters',  name: 'Circle Quarters',  category: rAscii, frames: ['\u25f4','\u25f7','\u25f6','\u25f5'], interval: 120 });
    all.push({ key: 'dqpb',            name: 'DQPB',             category: rAscii, frames: ['d','q','b','p'], interval: 100 });
    all.push({ key: 'grow_horizontal',  name: 'Grow Horizontal',  category: rAscii, frames: ['\u258f','\u258e','\u258d','\u258c','\u258b','\u258a','\u2589','\u2588','\u2589','\u258a','\u258b','\u258c','\u258d','\u258e'], interval: 80 });
    all.push({ key: 'grow_vertical',    name: 'Grow Vertical',    category: rAscii, frames: ['\u2581','\u2582','\u2583','\u2584','\u2585','\u2586','\u2587','\u2588','\u2587','\u2586','\u2585','\u2584','\u2583','\u2582'], interval: 80 });
    all.push({ key: 'noise',           name: 'Noise',            category: rAscii, frames: ['\u2593','\u2592','\u2591','\u2592'], interval: 100 });
    all.push({ key: 'point',           name: 'Point',            category: rAscii, frames: ['\u2219\u2219\u2219','\u25cf\u2219\u2219','\u2219\u25cf\u2219','\u2219\u2219\u25cf'], interval: 120 });
    all.push({ key: 'rolling_line',    name: 'Rolling Line',     category: rAscii, frames: ['\u2500','\\','\u2502','/'], interval: 100 });
    all.push({ key: 'simple_dots',     name: 'Simple Dots',      category: rAscii, frames: ['.  ','.. ','...',' ..','  .','   '], interval: 200 });
    all.push({ key: 'simple_dots_scrolling', name: 'Dots Scrolling', category: rAscii, frames: ['.  ','.. ','...','   '], interval: 200 });
    all.push({ key: 'square_corners',  name: 'Square Corners',   category: rAscii, frames: ['\u25f0','\u25f3','\u25f2','\u25f1'], interval: 120 });
    all.push({ key: 'toggle',          name: 'Toggle',           category: rAscii, frames: ['\u22b6','\u22b7'], interval: 250 });
    all.push({ key: 'triangle',        name: 'Triangle',         category: rAscii, frames: ['\u25e2','\u25e3','\u25e4','\u25e5'], interval: 120 });

    // ── Rattles — Braille ────────────────────────────────────────────────
    const rBraille = 'Rattles \u00b7 Braille';
    all.push({ key: 'dots',   name: 'Dots',   category: rBraille, frames: ['\u280b','\u2819','\u2839','\u2838','\u283c','\u2834','\u2826','\u2827','\u2807','\u280f'], interval: 80 });
    all.push({ key: 'dots2',  name: 'Dots 2', category: rBraille, frames: ['\u28fe','\u28fd','\u28fb','\u28bf','\u287f','\u28df','\u28ef','\u28f7'], interval: 80 });
    all.push({ key: 'dots3',  name: 'Dots 3', category: rBraille, frames: ['\u280b','\u2819','\u281a','\u281e','\u2816','\u2826','\u2834','\u2832','\u2833','\u2813'], interval: 80 });
    all.push({ key: 'dots4',  name: 'Dots 4', category: rBraille, frames: ['\u2804','\u2806','\u2807','\u280b','\u2819','\u2838','\u2830','\u2820','\u2830','\u2838','\u2819','\u280b','\u2807','\u2806'], interval: 80 });
    all.push({ key: 'dots5',  name: 'Dots 5', category: rBraille, frames: ['\u280b','\u2819','\u281a','\u2812','\u2802','\u2802','\u2812','\u2832','\u2834','\u2826','\u2816','\u2812','\u2810','\u2810','\u2812','\u2813','\u280b'], interval: 70 });
    all.push({ key: 'dots6',  name: 'Dots 6', category: rBraille, frames: ['\u2801','\u2809','\u2819','\u281a','\u2812','\u2802','\u2802','\u2812','\u2832','\u2834','\u2824','\u2804','\u2804','\u2824','\u2834','\u2832','\u2812','\u2802','\u2802','\u2812','\u281a','\u2819','\u2809','\u2801'], interval: 70 });
    all.push({ key: 'dots7',  name: 'Dots 7', category: rBraille, frames: ['\u2808','\u2809','\u280b','\u2813','\u2812','\u2810','\u2810','\u2812','\u2816','\u2826','\u2824','\u2820','\u2820','\u2824','\u2826','\u2816','\u2812','\u2810','\u2810','\u2812','\u2813','\u280b','\u2809','\u2808'], interval: 70 });
    all.push({ key: 'dots8',  name: 'Dots 8', category: rBraille, frames: ['\u2801','\u2801','\u2809','\u2819','\u281a','\u2812','\u2802','\u2802','\u2812','\u2832','\u2834','\u2824','\u2804','\u2804','\u2824','\u2820','\u2820','\u2824','\u2826','\u2816','\u2812','\u2810','\u2810','\u2812','\u2813','\u280b','\u2809','\u2808','\u2808'], interval: 70 });
    all.push({ key: 'dots9',  name: 'Dots 9', category: rBraille, frames: ['\u2839','\u283a','\u283c','\u28f8','\u28c7','\u2867','\u2857','\u284f'], interval: 80 });
    all.push({ key: 'dots10', name: 'Dots 10', category: rBraille, frames: ['\u2884','\u2882','\u2881','\u2841','\u2848','\u2850','\u2860'], interval: 80 });
    all.push({ key: 'dots11', name: 'Dots 11', category: rBraille, frames: ['\u2801','\u2802','\u2804','\u2840','\u2880','\u2820','\u2810','\u2808'], interval: 100 });
    all.push({ key: 'dots12', name: 'Dots 12', category: rBraille, frames: ['\u2880\u2800','\u2840\u2800','\u2804\u2800','\u2882\u2800','\u2842\u2800','\u2805\u2800','\u2883\u2800','\u2843\u2800','\u280d\u2800','\u288b\u2800','\u284b\u2800','\u280d\u2801','\u288b\u2801','\u284b\u2801','\u280d\u2809','\u280b\u2809','\u280b\u2809','\u2809\u2819','\u2809\u2819','\u2809\u2829','\u2808\u2899','\u2808\u2859','\u2888\u2829','\u2840\u2899','\u2804\u2859','\u2882\u2829','\u2842\u2898','\u2805\u2858','\u2883\u2828','\u2843\u2890','\u280d\u2850','\u288b\u2820','\u284b\u2880','\u280d\u2841','\u288b\u2801','\u284b\u2801','\u280d\u2809','\u280b\u2809','\u280b\u2809','\u2809\u2819','\u2809\u2819','\u2809\u2829','\u2808\u2899','\u2808\u2859','\u2808\u2829','\u2800\u2899','\u2800\u2859','\u2800\u2829','\u2800\u2898','\u2800\u2858','\u2800\u2828','\u2800\u2890','\u2800\u2850','\u2800\u2820','\u2800\u2880','\u2800\u2840'], interval: 80 });
    all.push({ key: 'dots13', name: 'Dots 13', category: rBraille, frames: ['\u28bc','\u28b9','\u28bb','\u283f','\u285f','\u28cf','\u28e7','\u28f6'], interval: 80 });
    all.push({ key: 'dots14', name: 'Dots 14', category: rBraille, frames: ['\u2809\u2809','\u2808\u2819','\u2800\u2839','\u2800\u2898','\u2800\u28b0','\u2880\u28a0','\u28c0\u28c0','\u28c4\u2840','\u28c6\u2800','\u2847\u2800','\u280f\u2800','\u280b\u2801'], interval: 80 });
    all.push({ key: 'dots_circle', name: 'Dots Circle', category: rBraille, frames: ['\u288e ','\u280e\u2801','\u280a\u2811','\u2808\u2831',' \u2871','\u2880\u2870','\u2884\u2860','\u2886\u2840'], interval: 80 });
    all.push({ key: 'infinity', name: 'Infinity', category: rBraille, frames: ['\u288e\u2871\u28c9\u2846','\u288e\u2871\u28c8\u2846','\u288e\u2871\u28c0\u2846','\u288e\u2871\u28c0\u2844','\u288e\u2871\u28c0 ','\u288e\u2871\u2840 ','\u288e\u2871  ','\u288e\u2871  ','\u288e\u2861  ','\u288e\u2860  ','\u2886\u2860  ','\u2884\u2860  ','\u2880\u2860  ',' \u2860  ',' \u2820  ',' \u2830  ',' \u2810  ',' \u2810\u2801 ',' \u2810\u2809 ',' \u2810\u2809\u2802',' \u2810\u2809\u2806',' \u2810\u2889\u2806',' \u2810\u28c9\u2806',' \u2830\u28c9\u2806',' \u2830\u28c9\u2846','\u2808\u2831\u28c9\u2846','\u280a\u2831\u28c9\u2846','\u280e\u2831\u28c9\u2846','\u288e\u2831\u28c9\u2846','\u288e\u2871\u28c9\u2846','\u288e\u2871\u28c9\u2846'], interval: 60 });
    all.push({ key: 'sand', name: 'Sand', category: rBraille, frames: ['\u2801','\u2802','\u2804','\u2840','\u2848','\u2850','\u2860','\u28c0','\u28c1','\u28c2','\u28c4','\u28cc','\u28d4','\u28e4','\u28e5','\u28e6','\u28ee','\u28f6','\u28f7','\u28ff','\u287f','\u283f','\u289f','\u281f','\u285b','\u288b','\u280b','\u280d','\u2849','\u2809','\u2811','\u2821','\u2881'], interval: 80 });
    all.push({ key: 'wave', name: 'Wave', category: rBraille, frames: ['\u2801\u2802\u2804\u2840','\u2802\u2804\u2840\u2880','\u2804\u2840\u2880\u2820','\u2840\u2880\u2820\u2810','\u2880\u2820\u2810\u2808','\u2820\u2810\u2808\u2801','\u2810\u2808\u2801\u2802','\u2808\u2801\u2802\u2804'], interval: 100 });
    all.push({ key: 'bounce', name: 'Bounce', category: rBraille, frames: ['\u2801','\u2802','\u2804','\u2840','\u2880','\u2820','\u2810','\u2808'], interval: 100 });

    return all;
}

function fmtName(key) {
    return key.replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/^./, c => c.toUpperCase())
              .replace('wave', 'Wave')
              .replace('line', 'Line')
              .replace('sweep', 'Sweep')
              .replace('swipe', 'Swipe')
              .replace('board', 'Board');
}

// Cached registry
let _registry = null;
function getRegistry() {
    if (!_registry) _registry = buildRegistry();
    return _registry;
}

// ─── DEFAULTS ────────────────────────────────────────────────────────────────
// scan = index 4, rain = index 5 (1-based in the registry)

const DEFAULT_LOADING = 4;  // scan
const DEFAULT_IDLE    = 5;  // rain

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

export function getAnimationList() {
    return getRegistry();
}

export function getAnimationCount() {
    return getRegistry().length;
}

export function getSelectedAnimations() {
    const cfg = loadConfig();
    const reg = getRegistry();
    const li = (cfg.loadingAnimation || DEFAULT_LOADING) - 1;
    const ii = (cfg.idleAnimation    || DEFAULT_IDLE)    - 1;
    return {
        loading: reg[li] || reg[DEFAULT_LOADING - 1],
        idle:    reg[ii] || reg[DEFAULT_IDLE - 1],
    };
}

export function setLoadingAnimation(num) {
    const cfg = loadConfig();
    cfg.loadingAnimation = num;
    saveConfig(cfg);
}

export function setIdleAnimation(num) {
    const cfg = loadConfig();
    cfg.idleAnimation = num;
    saveConfig(cfg);
}

export function getAnimationNames() {
    return getRegistry().map(a => a.name);
}

// ─── PREVIEW ─────────────────────────────────────────────────────────────────

export function showAnimationPreviews() {
    const reg = getRegistry();
    const cfg = loadConfig();
    const activeLoading = cfg.loadingAnimation || DEFAULT_LOADING;
    const activeIdle    = cfg.idleAnimation    || DEFAULT_IDLE;

    let lastCategory = '';

    console.log('');
    console.log(line('='));
    console.log(empty());
    console.log(row(`${DG}>>${RST} ${W}Animation Styles${RST}`));
    console.log(empty());

    for (let i = 0; i < reg.length; i++) {
        const a = reg[i];
        const num = i + 1;

        // Category header
        if (a.category !== lastCategory) {
            if (lastCategory !== '') console.log(empty());
            lastCategory = a.category;
            console.log(line('-'));
            console.log(row(`${DG}>>${RST} ${W}${a.category}${RST}`));
            console.log(line('-'));
        }

        // Active markers
        let marker = '';
        if (num === activeLoading && num === activeIdle) {
            marker = `  ${G}[loading] [idle]${RST}`;
        } else if (num === activeLoading) {
            marker = `  ${G}[loading]${RST}`;
        } else if (num === activeIdle) {
            marker = `  ${G}[idle]${RST}`;
        }

        // Sample frames — fit within remaining box width
        // Layout: 2 + 3(num) + 2 + 18(name) + 1 = 26 chars before frames
        const markerLen = marker ? visLen(marker) : 0;
        const maxSampleW = 61 - 26 - markerLen - 1;
        let samples = '';
        for (let f = 0; f < Math.min(8, a.frames.length); f++) {
            const next = samples ? samples + ' ' + a.frames[f] : a.frames[f];
            if (visLen(next) > maxSampleW) break;
            samples = next;
        }

        const numStr = `${C}${String(num).padStart(3)}${RST}`;
        const nameStr = `${W}${a.name.padEnd(18)}${RST}`;
        console.log(row(`  ${numStr}  ${nameStr} ${DIM}${samples}${RST}${marker}`));
    }

    console.log(empty());
    console.log(line('='));
    console.log(empty());
    console.log(row(`${DG}Set loading:${RST}  ${W}node osaint.js --set-loading=<number>${RST}`));
    console.log(row(`${DG}Set idle:${RST}     ${W}node osaint.js --set-idle=<number>${RST}`));
    console.log(row(`${DG}Live demo:${RST}    ${W}node osaint.js --anim-demo=<number>${RST}`));
    console.log(empty());
    console.log(line('='));
    console.log('');
}

// ─── LIVE DEMO ──────────────────────────────────────────────────────────────

export function demoAnimation(num) {
    const reg = getRegistry();
    if (num < 1 || num > reg.length) return Promise.resolve(false);
    const anim = reg[num - 1];

    return new Promise((resolve) => {
        process.stdout.write(HIDE);
        console.log('');
        console.log(line('-'));
        console.log(row(`${DG}>>${RST} ${W}Live Demo: ${C}${anim.name}${RST}  ${DG}(${anim.category})${RST}`));
        console.log(row(`${DG}Interval: ${W}${anim.interval}ms${RST}  ${DG}Frames: ${W}${anim.frames.length}${RST}`));
        console.log(line('-'));
        console.log('');

        let fi = 0;
        const timer = setInterval(() => {
            const frame = anim.frames[fi % anim.frames.length];
            process.stdout.write(`\r   ${C}${frame}${RST}  ${DIM}${W}${anim.name}${RST}    `);
            fi++;
        }, anim.interval);

        setTimeout(() => {
            clearInterval(timer);
            process.stdout.write(`\r${CLR}${SHOW}`);
            console.log('');
            resolve(true);
        }, 4000);
    });
}
