import { R, G, Y, B, M, C, W, DG, BR, BG, BY, BB, BM, BC, BW, BOLD, DIM, RST, stripAnsi, visLen } from './colors.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const CONFIG_PATH = join(__dir, '..', '.osaint-config.json');

const BOX_W = 63;

const DISPLAY_NAMES = {
    tiktok: 'TikTok', instagram: 'Instagram', discord: 'Discord',
    xiaohongshu: 'Xiaohongshu', bilibili: 'Bilibili', baidu: 'Baidu Pan',
    netease: 'NetEase Music', zhihu: 'Zhihu',
    claude: 'Claude', perplexity: 'Perplexity', microsoft: 'Microsoft', pinterest: 'Pinterest',
    substack: 'Substack', suno: 'Suno', spotify: 'Spotify Wrapped', telegram: 'Telegram',
    youtube: 'YouTube', googlephotos: 'Google Photos', partiful: 'Partiful',
    luma: 'Lu.ma', eventbrite: 'Eventbrite', teams: 'Teams',
    whatsapp: 'WhatsApp', qqcontact: 'QQ Contact', steamtrade: 'Steam Trade',
    onedrive: 'OneDrive', cashapp: 'Cash App', venmo: 'Venmo',
    paypalme: 'PayPal.Me', kofi: 'Ko-fi', buymeacoffee: 'Buy Me a Coffee',
    patreon: 'Patreon', linktree: 'Linktree', beacons: 'Beacons',
    calendly: 'Calendly', calcom: 'Cal.com', tidycal: 'TidyCal',
    youcanbookme: 'YouCanBookMe', savvycal: 'SavvyCal', acuity: 'Acuity',
    tickettailor: 'Ticket Tailor', humanitix: 'Humanitix', meetup: 'Meetup',
    ticketleap: 'TicketLeap', eventzilla: 'Eventzilla', universe: 'Universe',
    loom: 'Loom', medal: 'Medal.tv',
    twitch: 'Twitch', reddit: 'Reddit',
};
function displayName(name) { return DISPLAY_NAMES[name] || name; }

// ─── BOX PRIMITIVES ──────────────────────────────────────────────────────────

function line(c = '=') {
    if (c === '-') return `${DG}├${'─'.repeat(BOX_W)}┤${RST}`;
    if (c === 'bottom') return `${DG}└${'─'.repeat(BOX_W)}┘${RST}`;
    return `${DG}┌${'─'.repeat(BOX_W)}┐${RST}`;
}
function wrapPlain(text, width) {
    const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
    const lines = [];
    let current = '';

    function pushHard(value) {
        let rest = value;
        while (rest.length > width) {
            lines.push(rest.slice(0, width));
            rest = rest.slice(width);
        }
        return rest;
    }

    for (const word of words) {
        if (!word) continue;
        if (word.length > width) {
            if (current.trimEnd()) lines.push(current.trimEnd());
            current = pushHard(word);
            continue;
        }
        if (!current) {
            current = word;
        } else if (current.length + 1 + word.length <= width) {
            current += ` ${word}`;
        } else {
            lines.push(current.trimEnd());
            current = word;
        }
    }

    if (current.trimEnd()) lines.push(current.trimEnd());
    return lines.length ? lines : [''];
}
function boxedRow(content) {
    const pad = Math.max(0, BOX_W - visLen(content));
    return `${DG}│${RST}${content}${' '.repeat(pad)}${DG}│${RST}`;
}
function row(content)  {
    if (visLen(content) <= BOX_W) return boxedRow(content);

    return wrapPlain(stripAnsi(content), BOX_W)
        .map(lineText => boxedRow(lineText))
        .join('\n');
}
function empty() { return row(''); }

// ─── ALL BANNER STYLES ───────────────────────────────────────────────────────

function getStyles() {
    return [
        { name: 'ANSI Shadow (modified)', art: [
            row(` ${W}██████╗  ${C}███████╗ █████╗ ██╗███╗  ██╗████████╗${RST}`),
            row(` ${W}██╔══██╗ ${C}██╔════╝██╔══██╗██║████╗ ██║╚══██╔══╝${RST}`),
            row(` ${W}██║  ██║ ${C}███████╗███████║██║██╔██╗██║   ██║   ${RST}`),
            row(` ${W}██║  ██║ ${C}╚════██║██╔══██║██║██║╚████║   ██║   ${RST}`),
            row(` ${W}╚██████║ ${C}███████║██║  ██║██║██║ ╚███║   ██║   ${RST}`),
            row(` ${W} ╚═════╝ ${C}╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚══╝   ╚═╝   ${RST}`),
        ]},
        { name: 'ANSI Shadow (original)', art: [
            row(` ${W} ██████╗ ${C}███████╗ █████╗ ██╗███╗   ██╗████████╗${RST}`),
            row(` ${W}██╔═══██╗${C}██╔════╝██╔══██╗██║████╗  ██║╚══██╔══╝${RST}`),
            row(` ${W}██║   ██║${C}███████╗███████║██║██╔██╗ ██║   ██║   ${RST}`),
            row(` ${W}██║   ██║${C}╚════██║██╔══██║██║██║╚██╗██║   ██║   ${RST}`),
            row(` ${W}╚██████╔╝${C}███████║██║  ██║██║██║ ╚████║   ██║   ${RST}`),
            row(` ${W} ╚═════╝ ${C}╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝${RST}`),
        ]},
        { name: 'Bloody', art: [
            row(` ${W}▒█████  ${C} ██████  ▄▄▄       ██▓███▄    █▄▄▄█████▓${RST}`),
            row(` ${W}▒██▒ ██▒${C}▒██    ▒ ▒████▄   ▓██▒██ ▀█  █▓ ██▒ ▓▒${RST}`),
            row(` ${W}▒██░ ██▒${C}░ ▓██▄   ▒██  ▀█▄ ▒██▓██  ▀███▒▒▓██░ ▒░${RST}`),
            row(` ${W}▒██  ██░${C} ▒  ██▒ ░██▄▄▄▄██░██░▓██▒ ▐▌██░▓██▓ ░ ${RST}`),
            row(` ${W}░████▓▒░${C}▒██████▒▒▓█  ▓██▒░██░▒██░  ▓██░ ▒██▒ ░${RST}`),
        ]},
        { name: 'Unicode Blocks', art: [
            row(`     ${W}█▀▀▀█  ${C}█▀▀▀▀ █▀▀▀█ ▀█▀ █▄  █ ▀▀█▀▀${RST}`),
            row(`     ${W}█   █  ${C}▀▀▀▀█ █▀▀▀█  █  █ █▄█   █  ${RST}`),
            row(`     ${W}▀▀▀▀▀  ${C}▀▀▀▀▀ ▀   ▀ ▀▀▀ ▀  ▀▀   ▀  ${RST}`),
        ]},
        { name: 'Elite', art: [
            row(`     ${W}     ${C} .▄▄ ·  ▄▄▄· ▪   ▐ ▄ ▄▄▄▄▄${RST}`),
            row(`     ${W}▪    ${C} ▐█ ▀. ▐█ ▀█ ██ •█▌▐█•██  ${RST}`),
            row(`     ${W} ▄█▀▄${C} ▄▀▀▀█▄▄█▀▀█ ▐█·▐█▐▐▌ ▐█.▪${RST}`),
            row(`     ${W}▐█▌.▐▌${C}▐█▄▪▐█▐█ ▪▐▌▐█▌██▐█▌ ▐█▌·${RST}`),
            row(`     ${W} ▀█▄▀▪${C} ▀▀▀▀  ▀  ▀ ▀▀▀▀▀ █▪ ▀▀▀ ${RST}`),
        ]},
        { name: 'Bold Block', art: [
            row(`    ${W}▄▄▄▄▄  ${C}▄▄▄▄▄ ▄▄▄▄▄ ▄▄▄ ▄   ▄ ▄▄▄▄▄${RST}`),
            row(`    ${W}█   █  ${C}█     █   █  █  █▀▄ █   █  ${RST}`),
            row(`    ${W}█   █  ${C}▀▀▀█  █▀▀▀█  █  █  ▀█   █  ${RST}`),
            row(`    ${W}▀▀▀▀▀  ${C}▀▀▀▀▀ ▀   ▀ ▀▀▀ ▀   ▀   ▀  ${RST}`),
        ]},
        { name: 'Double Box-Drawing', art: [
            row(`     ${W}╔══╗  ${C}╔══╗ ╔══╗ ══╦══ ╔══╗ ══╦══${RST}`),
            row(`     ${W}║  ║  ${C}╚══╗ ╠══╣   ║   ║  ║   ║  ${RST}`),
            row(`     ${W}║  ║  ${C}   ║ ║  ║   ║   ║  ║   ║  ${RST}`),
            row(`     ${W}╚══╝  ${C}╚══╝ ╩  ╩ ══╩══ ╚══╝ ══╩══${RST}`),
        ]},
        { name: 'Thick Box-Drawing', art: [
            row(`     ${W}┏━━┓  ${C}┏━━┓ ┏━━┓ ━┳━ ┏━┓┓ ━┳━${RST}`),
            row(`     ${W}┃  ┃  ${C}┗━━┓ ┣━━┫  ┃  ┃┗┫┃  ┃ ${RST}`),
            row(`     ${W}┗━━┛  ${C}┗━━┛ ╹  ╹ ━┻━ ╹ ┗╹ ━┻━${RST}`),
        ]},
        { name: 'Delta Corps', art: [
            row(` ${W}▄██████▄  ${C}▄████████  ▄████████ ▄█  ███▄▄▄▄    ███${RST}`),
            row(` ${W}███  ███  ${C}███    ███ ███    ███ ███ ███▀▀▀██▄ ▀███▀▀${RST}`),
            row(` ${W}███  ███  ${C}███    █▀  ███    ███ ███▌███   ███  ███  ${RST}`),
            row(` ${W}███  ███  ${C}▀██████   ▀██████████ ███▌███   ███  ███  ${RST}`),
            row(` ${W}███  ███  ${C}     ███   ███    ███ ███ ███   ███  ███  ${RST}`),
            row(` ${W} ▀██████▀ ${C}▄████████▀  ███    █▀  █▀  ▀█   █▀  ▄████▀${RST}`),
        ]},
        { name: 'Slant', art: [
            row(`    ${W}  ____  ${C}_____ ___    _____   ________${RST}`),
            row(`    ${W} / __ \\${C}/ ___//   |  /  _/ | / /_  __/${RST}`),
            row(`    ${W}/ / / /${C}\\__ \\/ /| |  / //  |/ / / /   ${RST}`),
            row(`    ${W}/ /_/ /${C}___/ / ___ |_/ // /|  / / /    ${RST}`),
            row(`    ${W}\\____/${C}/____/_/  |_/___/_/ |_/ /_/     ${RST}`),
        ]},
        { name: 'Braille Dots', art: [
            row(`     ${W}⣿⣿⣿  ${C}⣿⣿⣿ ⣿⣿⣿ ⣿ ⣿⡄⣿ ⣿⣿⣿${RST}`),
            row(`     ${W}⣿ ⣿  ${C}⣿    ⣿ ⣿ ⣿ ⣿⣿⣿  ⣿ ${RST}`),
            row(`     ${W}⣿ ⣿  ${C} ⣿⣿ ⣿⣿⣿ ⣿ ⣿ ⣿⣿  ⣿ ${RST}`),
            row(`     ${W}⣿⣿⣿  ${C}⣿⣿⣿ ⣿ ⣿ ⣿ ⣿  ⣿  ⣿ ${RST}`),
        ]},
        { name: 'Curved Blocks', art: [
            row(` ${W}▄▀▀▀▀▄  ${C} ▄▀▀▀▀▄ ▄▀▀█▄  ▄▀▀█▀▄  ▄▀▀▄ ▀▄ ▄▀▀▀█▀▀▄${RST}`),
            row(` ${W}█    █  ${C}█ █  ▐ ▐ ▄▀ ▀▄ █  █  █ █  █ █ ██   █  ▐${RST}`),
            row(` ${W}█    █  ${C}   ▀▄    █▄▄▄█ ▐  █  ▐ ▐  █  ▀█ ▐  █   ${RST}`),
            row(` ${W}▀▄  ▄▀  ${C}▀▄  █   ▄▀  █    █      █  █    █   ${RST}`),
            row(` ${W} ▀▀▀▀   ${C} █▀▀▀  █   ▄▀  ▄▀▀▀▀▀▄ ▄▀  █   ▄▀   ${RST}`),
        ]},
        { name: 'Banner 3-D', art: [
            row(` ${W}:'#####':${C}:'######':::'###'::'####:'##:: ##:'########:${RST}`),
            row(` ${W}'##...##:${C}'##...##::'## ##::. ##::'###: ##:...'##..::: ${RST}`),
            row(` ${W} ##:: ##:${C} ##:::..:'##:. ##:: ##:: ####:##:::: ##::::: ${RST}`),
            row(` ${W} ##:: ##:${C}. #####:'##::: ##:: ##:: ##.####:::: ##::::: ${RST}`),
            row(` ${W} ##:: ##:${C}:.....##: ########:: ##:: ##:.###:::: ##::::: ${RST}`),
            row(` ${W}'##...##:${C}'##:: ##: ##....##:: ##:: ##::. ##:::: ##::::: ${RST}`),
            row(` ${W}:'#####':${C}. ####:: ##:::: ##:'####: ##:::. #:::: ##::::: ${RST}`),
        ]},
    ];
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────

function loadConfig() {
    try {
        if (existsSync(CONFIG_PATH)) return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    } catch {}
    return { bannerStyle: 2 }; // default: ANSI Shadow (original)
}

function saveConfig(cfg) {
    writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

export function setBannerStyle(num) {
    const cfg = loadConfig();
    cfg.bannerStyle = num;
    saveConfig(cfg);
}

export function getBannerStyleNames() {
    return getStyles().map(s => s.name);
}

// ─── BANNER ──────────────────────────────────────────────────────────────────

export function printBanner() {
    const top = line('=');
    const mid = line('-');
    const cfg = loadConfig();
    const styles = getStyles();
    const style = styles[(cfg.bannerStyle || 2) - 1] || styles[1];

    const lines = [
        '', top, empty(),
        ...style.art,
        empty(), mid,
        row(`${DG}Share Link Intelligence${RST}${' '.repeat(34)}${DIM}${DG}v1.0.0${RST}`),
        line('bottom'), '',
    ];
    console.log(lines.join('\n'));
}

// ─── TARGET INFO ─────────────────────────────────────────────────────────────

export function printTargetBox(platform, url) {
    console.log([
        line('='),
        row(`${DG}Platform ${DG}>>${RST}  ${W}${displayName(platform)}${RST}`),
        row(`${DG}Target   ${DG}>>${RST}  ${DIM}${W}${url}${RST}`),
        line('bottom'),
        '',
    ].join('\n'));
}

// ─── RESULTS ─────────────────────────────────────────────────────────────────

export function printResults(data, platform) {
    const top = line('=');
    const mid = line('-');

    const lines = [top];
    lines.push(row(`${DG}>>${RST} ${W}Results ${DG}::${RST} ${C}${displayName(platform)}${RST}`));
    lines.push(mid);

    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) continue;
        const label = fmtLabel(key);
        const val = fmtValue(key, value);
        const dots = '.'.repeat(Math.max(1, 20 - visLen(label)));
        lines.push(row(`${DG}${label} ${DG}${dots}${RST} ${val}`));
    }

    lines.push(line('bottom'), '');
    console.log(lines.join('\n'));
}

// ─── ERROR ───────────────────────────────────────────────────────────────────

export function printError(message) {
    console.log([
        line('='),
        row(`${BR}>> ${R}Error${RST}`),
        row(`${DIM}${W}${message}${RST}`),
        line('bottom'),
        '',
    ].join('\n'));
}

// ─── PLATFORM LIST ───────────────────────────────────────────────────────────

export function printPlatformList(platforms) {
    const top = line('=');
    const mid = line('-');

    const lines = [top];
    lines.push(row(`${DG}>>${RST} ${W}Supported Platforms${RST}`));
    lines.push(mid);

    const dn = displayName;
    for (const p of platforms) {
        const name = dn(p.name).padEnd(12);
        lines.push(row(`${DG}>>${RST} ${W}${name}${RST} ${DG}${p.desc}${RST}`));
    }

    lines.push(line('bottom'), '');
    console.log(lines.join('\n'));
}

// ─── HELP ────────────────────────────────────────────────────────────────────

export function printHelp() {
    const top = line('=');
    const mid = line('-');

    console.log([
        top,
        row(`${DG}>>${RST} ${W}Usage${RST}`),
        mid,
        row(`${W}node osaint.js ${C}<url>${RST}  ${DG}................${RST} ${DIM}${W}Analyze link${RST}`),
        row(`${W}node osaint.js ${C}<url>${RST} ${BY}--json${RST}  ${DG}........${RST} ${DIM}${W}JSON output${RST}`),
        row(`${W}node osaint.js ${BY}--list${RST}  ${DG}................${RST} ${DIM}${W}Platforms${RST}`),
        row(`${W}node osaint.js ${BY}--test${RST}  ${DG}................${RST} ${DIM}${W}Self-test${RST}`),
        row(`${W}node osaint.js ${BY}--animations${RST}  ${DG}..........${RST} ${DIM}${W}Animations${RST}`),
        row(`${W}node osaint.js ${BY}--help${RST}  ${DG}................${RST} ${DIM}${W}This help${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Flags${RST}`),
        mid,
        row(`${BY}-j${RST}  ${DG}--json${RST}   ${DG}>>  ${DIM}${W}Output raw JSON for scripting${RST}`),
        row(`${BY}-q${RST}  ${DG}--quiet${RST}  ${DG}>>  ${DIM}${W}Suppress banner${RST}`),
        row(`${BY}-l${RST}  ${DG}--list${RST}   ${DG}>>  ${DIM}${W}Show all supported platforms${RST}`),
        row(`${BY}-h${RST}  ${DG}--help${RST}   ${DG}>>  ${DIM}${W}Show this help${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Note${RST}`),
        mid,
        row(`${DIM}${W}Best display: Windows Terminal with Command Prompt${RST}`),
        row(`${DIM}${W}PowerShell can wrap/redraw box lines less cleanly${RST}`),
        row(`${DIM}${W}Always wrap URLs in quotes in PowerShell${RST}`),
        row(`${DIM}${W}e.g. node osaint.js ${C}"https://..."${RST}`),
        line('bottom'), '',
    ].join('\n'));
}

// ─── COMMANDS ────────────────────────────────────────────────────────────────

export function printCommands() {
    const top = line('=');
    const mid = line('-');

    console.log([
        top,
        row(`${DG}>>${RST} ${W}Commands${RST}`),
        mid,
        row(`${BY}--help${RST}    ${DG}${BY}-h${RST}  ${DG}>>  ${DIM}${W}Quick usage guide${RST}`),
        row(`${BY}--howto${RST}   ${BY}--how${RST}${DG}>>  ${DIM}${W}Detailed guide per platform${RST}`),
        row(`${BY}--commands${RST} ${BY}--cmd${RST}${DG}>>  ${DIM}${W}This command list${RST}`),
        row(`${BY}--list${RST}    ${DG}${BY}-l${RST}  ${DG}>>  ${DIM}${W}Show supported platforms${RST}`),
        row(`${BY}--test${RST}         ${DG}>>  ${DIM}${W}Run self-test suite${RST}`),
        row(`${BY}--banner${RST}       ${DG}>>  ${DIM}${W}Preview all banner styles${RST}`),
        row(`${BY}--set-banner=N${RST} ${DG}>>  ${DIM}${W}Set banner to style N${RST}`),
        row(`${BY}--animations${RST}   ${DG}>>  ${DIM}${W}Preview all animation styles${RST}`),
        row(`${BY}--anim-demo=N${RST} ${DG}>>  ${DIM}${W}Live demo of animation N${RST}`),
        row(`${BY}--set-loading=N${RST}${DG}>>  ${DIM}${W}Set loading animation to N${RST}`),
        row(`${BY}--set-idle=N${RST}   ${DG}>>  ${DIM}${W}Set idle animation to N${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Analysis${RST}`),
        mid,
        row(`${C}<url>${RST}              ${DG}>>  ${DIM}${W}Analyze a share link${RST}`),
        row(`${C}<url>${RST} ${BY}--json${RST}       ${DG}>>  ${DIM}${W}Output as JSON${RST}`),
        row(`${C}<url>${RST} ${BY}--quiet${RST}      ${DG}>>  ${DIM}${W}No banner, just results${RST}`),
        row(`${C}<url>${RST} ${BY}-q --json${RST}    ${DG}>>  ${DIM}${W}Clean JSON only${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Note${RST}`),
        mid,
        row(`${DIM}${W}Best display: Windows Terminal with Command Prompt${RST}`),
        row(`${DIM}${W}PowerShell can wrap/redraw box lines less cleanly${RST}`),
        row(`${DIM}${W}Always wrap URLs in ${C}"quotes"${DIM}${W} in PowerShell${RST}`),
        line('bottom'), '',
    ].join('\n'));
}

// ─── HOW TO ──────────────────────────────────────────────────────────────────

export function printHowTo() {
    const top = line('=');
    const mid = line('-');

    console.log([
        top,
        row(`${DG}>>${RST} ${W}How OSAINT Works${RST}`),
        mid,
        row(`${DIM}${W}When someone shares a link on social media, the${RST}`),
        row(`${DIM}${W}platform injects tracking data into the URL that${RST}`),
        row(`${DIM}${W}can reveal ${C}who shared it${DIM}${W}. OSAINT extracts this.${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Instagram${RST}  ${DG}>> igsh= parameter${RST}`),
        mid,
        row(`${DIM}${W}Tap Share >> Copy Link on any reel or post.${RST}`),
        row(`${DIM}${W}The ${C}?igsh=${DIM}${W} param is tied to the sharer's account.${RST}`),
        row(`${DIM}${W}Returns: ${C}username, user ID, name, avatar${RST}`),
        row(`${DG}Ex: ${DIM}${C}instagram.com/reel/abc/?igsh=MXdxazJ5...${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Discord${RST}  ${DG}>> invite code${RST}`),
        mid,
        row(`${DIM}${W}Click Invite People >> Copy in any server.${RST}`),
        row(`${DIM}${W}The invite code maps to the inviter's account.${RST}`),
        row(`${DIM}${W}Returns: ${C}username, user ID, avatar, created date${RST}`),
        row(`${DG}Ex: ${DIM}${C}discord.gg/r5Kx7Gp${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}TikTok${RST}  ${DG}>> short link tracking${RST}`),
        mid,
        row(`${DIM}${W}Tap Share >> Copy Link on any video.${RST}`),
        row(`${DIM}${W}The short URL embeds sharer data in redirect.${RST}`),
        row(`${DIM}${W}Returns: ${C}username, name, share token, timestamp${RST}`),
        row(`${DG}Ex: ${DIM}${C}vm.tiktok.com/ZMkGYwJUa/${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Twitch${RST}  ${DG}>> clip creator via GQL API${RST}`),
        mid,
        row(`${DIM}${W}Click Share on any clip.${RST}`),
        row(`${DIM}${W}The clip URL reveals who ${C}captured${DIM}${W} the clip.${RST}`),
        row(`${DIM}${W}Returns: ${C}clipper username, user ID, channel${RST}`),
        row(`${DG}Ex: ${DIM}${C}clips.twitch.tv/FunnyClipSlug-abc123${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}YouTube${RST}  ${DG}>> clip creator from clip page${RST}`),
        mid,
        row(`${DIM}${W}Create or copy a YouTube Clip link.${RST}`),
        row(`${DIM}${W}Clip pages expose the person who ${C}clipped${DIM}${W} it.${RST}`),
        row(`${DIM}${W}Returns: ${C}clipper name, clip ID${RST}`),
        row(`${DG}Ex: ${DIM}${C}youtube.com/clip/Ugkx...${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Teams${RST}  ${DG}>> organizer IDs in meeting URL${RST}`),
        mid,
        row(`${DIM}${W}Copy a Microsoft Teams meeting invite link.${RST}`),
        row(`${DIM}${W}The ${C}context${DIM}${W} param carries organizer and tenant IDs.${RST}`),
        row(`${DIM}${W}Returns: ${C}user ID, tenant ID${RST}  ${DG}(offline)${RST}`),
        row(`${DG}Ex: ${DIM}${C}teams.microsoft.com/l/meetup-join/...${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Microsoft${RST}  ${DG}>> email in URL (offline)${RST}`),
        mid,
        row(`${DIM}${W}Click Share >> Copy Link on a SharePoint file.${RST}`),
        row(`${DIM}${W}The sharer's email is encoded in the URL path.${RST}`),
        row(`${DIM}${W}Returns: ${C}email address${RST}  ${DG}(no HTTP needed)${RST}`),
        row(`${DG}Ex: ${DIM}${C}company-my.sharepoint.com/.../jane_doe_co_com/${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Telegram${RST}  ${DG}>> creator ID from hash (offline)${RST}`),
        mid,
        row(`${DIM}${W}Create an invite link in a group.${RST}`),
        row(`${DIM}${W}The hash decodes to the creator's numeric ID.${RST}`),
        row(`${DIM}${W}Returns: ${C}creator user ID${RST}  ${DG}(no HTTP needed)${RST}`),
        row(`${DG}Ex: ${DIM}${C}t.me/joinchat/BgFGOkI4OTk${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Bilibili${RST}  ${DG}>> sharer MID in app URL${RST}`),
        mid,
        row(`${DIM}${W}Share from the Bilibili app.${RST}`),
        row(`${DIM}${W}Some app URLs include the sharer's ${C}mid${DIM}${W}.${RST}`),
        row(`${DIM}${W}Returns: ${C}user ID, profile URL${RST}  ${DG}(offline)${RST}`),
        row(`${DG}Ex: ${DIM}${C}bilibili.com/video/BV...?mid=123${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Baidu Pan${RST}  ${DG}>> sharer UK in old links${RST}`),
        mid,
        row(`${DIM}${W}Old Netdisk share links include ${C}uk${DIM}${W}.${RST}`),
        row(`${DIM}${W}That UK maps to the sharer's public share home.${RST}`),
        row(`${DIM}${W}Returns: ${C}user ID, profile URL, share ID${RST}  ${DG}(offline)${RST}`),
        row(`${DG}Ex: ${DIM}${C}pan.baidu.com/share/link?shareid=1&uk=2${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}NetEase Music${RST}  ${DG}>> sharer userid${RST}`),
        mid,
        row(`${DIM}${W}Share from NetEase Cloud Music.${RST}`),
        row(`${DIM}${W}The ${C}userid${DIM}${W} param maps to the sharer's profile.${RST}`),
        row(`${DIM}${W}Returns: ${C}user ID, name, avatar${RST}`),
        row(`${DG}Ex: ${DIM}${C}music.163.com/song/123/?userid=456${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Zhihu${RST}  ${DG}>> legacy utm_member${RST}`),
        mid,
        row(`${DIM}${W}Some old app shares encoded a member slug.${RST}`),
        row(`${DIM}${W}OSAINT decodes only valid 32-char profile IDs.${RST}`),
        row(`${DIM}${W}Returns: ${C}user ID, profile URL${RST}  ${DG}(offline)${RST}`),
        row(`${DG}Ex: ${DIM}${C}zhihu.com/question/1?utm_member=...${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Also Supported${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Perplexity${RST}  ${DG}Thread author from search URL${RST}`),
        row(`${DG}>>${RST} ${W}Pinterest${RST}   ${DG}Sender from pin.it invite code${RST}`),
        row(`${DG}>>${RST} ${W}Substack${RST}    ${DG}Referring user from ?r= param${RST}`),
        row(`${DG}>>${RST} ${W}Suno${RST}        ${DG}Sharer handle from share code${RST}`),
        row(`${DG}>>${RST} ${W}Google Photos${RST}${DG}Album owner from shared album${RST}`),
        row(`${DG}>>${RST} ${W}Partiful${RST}    ${DG}Host user from event invite${RST}`),
        row(`${DG}>>${RST} ${W}Lu.ma${RST}       ${DG}Host user from event invite${RST}`),
        row(`${DG}>>${RST} ${W}Eventbrite${RST}  ${DG}Organizer from event invite${RST}`),
        row(`${DG}>>${RST} ${W}WhatsApp${RST}    ${DG}Phone/account from click-to-chat link${RST}`),
        row(`${DG}>>${RST} ${W}Steam Trade${RST} ${DG}Steam account from trade URL${RST}`),
        row(`${DG}>>${RST} ${W}Booking Apps${RST} ${DG}Calendly, Cal.com, TidyCal, Acuity${RST}`),
        row(`${DG}>>${RST} ${W}Payment Profiles${RST}${DG}Cash App, Venmo, PayPal.Me, Ko-fi${RST}`),
        row(`${DG}>>${RST} ${W}Profile Hubs${RST} ${DG}Patreon, Linktree, Beacons${RST}`),
        row(`${DG}>>${RST} ${W}Event Hosts${RST} ${DG}Humanitix, Meetup, TicketLeap, Universe${RST}`),
        row(`${DG}>>${RST} ${W}Recordings${RST}  ${DG}Loom and Medal clip owners${RST}`),
        row(`${DG}>>${RST} ${W}Xiaohongshu${RST} ${DG}Sharer ID from app share params${RST}`),
        row(`${DG}>>${RST} ${W}Reddit${RST}      ${DG}Sharer from /r/<sub>/s/<id> link${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Customization${RST}`),
        mid,
        row(`${DIM}${W}OSAINT lets you customize the banner and${RST}`),
        row(`${DIM}${W}animations. Settings are saved to config.${RST}`),
        empty(),
        row(`${BY}--banner${RST}         ${DG}Preview all banner styles${RST}`),
        row(`${BY}--set-banner=N${RST}   ${DG}Set banner to style N${RST}`),
        empty(),
        row(`${BY}--animations${RST}     ${DG}Preview all 52 animation styles${RST}`),
        row(`${BY}--anim-demo=N${RST}   ${DG}Live demo of a specific animation${RST}`),
        row(`${BY}--set-loading=N${RST}  ${DG}Set the active/scanning animation${RST}`),
        row(`${BY}--set-idle=N${RST}     ${DG}Set the completed/idle animation${RST}`),
        empty(),
        row(`${DIM}${W}Animations come from ${C}unicode-animations${DIM}${W} and${RST}`),
        row(`${DIM}${W}${C}rattles${DIM}${W}. Run ${BY}--animations${DIM}${W} to see the full list.${RST}`),
        line('bottom'), '',
    ].join('\n'));
}

// ─── FORMATTING HELPERS ──────────────────────────────────────────────────────

const LABELS = {
    user_id: 'User ID', username: 'Username', name: 'Name', email: 'Email',
    profile_url: 'Profile', avatar_url: 'Avatar', created_at: 'Created',
    country: 'Country', device: 'Device', share_method: 'Share Method',
    shared_at: 'Shared At', follower_count: 'Followers', following_count: 'Following',
    video_count: 'Videos', heart_count: 'Hearts', private_account: 'Private',
    dm_available: 'DMs Open', bio: 'Bio', signature: 'Signature',
    previous_name: 'Prev Name', profile_set_up_at: 'Profile Set Up',
    reader_installed_at: 'Reader Installed', photo_url: 'Photo', handle: 'Handle',
    share_token: 'Share Token', share_source: 'Share Source',
    post_id: 'Post ID', resolved_url: 'Resolved URL',
    clip_id: 'Clip ID', channel: 'Channel', share_method: 'Share Method',
    subreddit: 'Subreddit', profile_sharing: 'Profile Sharing',
    share_red_id: 'Share Red ID', author_share: 'Author Share',
    share_id: 'Share ID', device_id: 'Device ID', file_id: 'File ID',
    content_id: 'Content ID', content_creator_id: 'Content Creator',
    listened_songs: 'Listened Songs', share_type: 'Share Type',
    start_time_ms: 'Start Ms', end_time_ms: 'End Ms',
    tenant_id: 'Tenant ID', meeting_id: 'Meeting ID', host_count: 'Host Count',
    organization_id: 'Organization ID', super_organizer: 'Super Organizer',
    instagram: 'Instagram', twitter: 'Twitter', linkedin: 'LinkedIn',
    website: 'Website', on_partiful: 'On Partiful', verified: 'Verified',
    phone_number: 'Phone', account_id: 'Account ID', owner_id: 'Owner ID',
    event_id: 'Event ID', booking_id: 'Booking ID', box_office: 'Box Office',
    cashtag: 'Cashtag',
};

function fmtLabel(key) {
    return (LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
}

function fmtValue(key, value) {
    if (typeof value === 'boolean') return value ? `${G}Yes${RST}` : `${R}No${RST}`;
    if (typeof value === 'number') return `${W}${value.toLocaleString()}${RST}`;
    const s = String(value);
    return s.startsWith('http') ? `${C}${s}${RST}` : `${W}${s}${RST}`;
}

// ─── BANNER PREVIEWS ─────────────────────────────────────────────────────────

export function showBannerPreviews() {
    const top = line('=');
    const mid = line('-');
    const sub = row(`${DG}Share Link Intelligence${RST}${' '.repeat(34)}${DIM}${DG}v1.0.0${RST}`);
    const cfg = loadConfig();
    const styles = getStyles();

    for (let i = 0; i < styles.length; i++) {
        const st = styles[i];
        const active = (cfg.bannerStyle || 4) === i + 1;
        const marker = active ? `${C}[active]${RST}` : '';
        console.log('');
        console.log(`   ${W}Style ${i + 1}: ${st.name}${RST} ${marker}`);
        console.log(top);
        console.log(empty());
        for (const l of st.art) console.log(l);
        console.log(empty());
        console.log(mid);
        console.log(sub);
        console.log(line('bottom'));
    }
    console.log('');
    console.log(`   ${DG}Set banner: ${W}node osaint.js --set-banner=<number>${RST}`);
    console.log('');
}

export { line, row, empty, BOX_W, displayName };
