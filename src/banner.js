import { R, G, Y, B, M, C, W, DG, BR, BG, BY, BB, BM, BC, BW, BOLD, DIM, RST, visLen } from './colors.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const CONFIG_PATH = join(__dir, '..', '.osaint-config.json');

const BOX_W = 63;

const DISPLAY_NAMES = {
    tiktok: 'TikTok', instagram: 'Instagram', discord: 'Discord',
    claude: 'Claude', perplexity: 'Perplexity', microsoft: 'Microsoft', pinterest: 'Pinterest',
    substack: 'Substack', suno: 'Suno', telegram: 'Telegram',
    twitch: 'Twitch', reddit: 'Reddit',
};
function displayName(name) { return DISPLAY_NAMES[name] || name; }

// ─── BOX PRIMITIVES ──────────────────────────────────────────────────────────

function line(c = '=') { return `   ${DG}+${c.repeat(BOX_W)}+${RST}`; }
function row(content)  {
    const vl = visLen(content);
    if (vl > BOX_W - 2) {
        const overBy = vl - (BOX_W - 5);
        const stripped = content.substring(0, content.length - overBy);
        const pad = Math.max(0, BOX_W - 2 - visLen(stripped) - 3);
        return `   ${DG}|${RST} ${stripped}...${' '.repeat(pad)} ${DG}|${RST}`;
    }
    const pad = Math.max(0, BOX_W - 2 - vl);
    return `   ${DG}|${RST} ${content}${' '.repeat(pad)} ${DG}|${RST}`;
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
        row(`   ${DG}Share Link Intelligence${RST}              ${DIM}${DG}v1.0.0${RST}`),
        top, '',
    ];
    console.log(lines.join('\n'));
}

// ─── TARGET INFO ─────────────────────────────────────────────────────────────

export function printTargetBox(platform, url) {
    const maxUrl = BOX_W - 18;
    const truncUrl = url.length > maxUrl ? url.substring(0, maxUrl - 3) + '...' : url;
    console.log([
        line('-'),
        row(`${DG}Platform ${DG}>>${RST}  ${W}${displayName(platform)}${RST}`),
        row(`${DG}Target   ${DG}>>${RST}  ${DIM}${W}${truncUrl}${RST}`),
        line('-'),
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
        lines.push(row(`   ${DG}${label} ${DG}${dots}${RST} ${val}`));
    }

    lines.push(top, '');
    console.log(lines.join('\n'));
}

// ─── ERROR ───────────────────────────────────────────────────────────────────

export function printError(message) {
    console.log([
        line('-'),
        row(`${BR}>> ${R}Error${RST}`),
        row(`   ${DIM}${W}${message}${RST}`),
        line('-'),
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
        lines.push(row(`   ${DG}>>${RST} ${W}${name}${RST} ${DG}${p.desc}${RST}`));
    }

    lines.push(top, '');
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
        row(`   ${W}node osaint.js ${C}<url>${RST}  ${DG}................${RST} ${DIM}${W}Analyze link${RST}`),
        row(`   ${W}node osaint.js ${C}<url>${RST} ${BY}--json${RST}  ${DG}........${RST} ${DIM}${W}JSON output${RST}`),
        row(`   ${W}node osaint.js ${BY}--list${RST}  ${DG}................${RST} ${DIM}${W}Platforms${RST}`),
        row(`   ${W}node osaint.js ${BY}--test${RST}  ${DG}................${RST} ${DIM}${W}Self-test${RST}`),
        row(`   ${W}node osaint.js ${BY}--help${RST}  ${DG}................${RST} ${DIM}${W}This help${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Flags${RST}`),
        mid,
        row(`   ${BY}-j${RST}  ${DG}--json${RST}   ${DG}>>  ${DIM}${W}Output raw JSON for scripting${RST}`),
        row(`   ${BY}-q${RST}  ${DG}--quiet${RST}  ${DG}>>  ${DIM}${W}Suppress banner${RST}`),
        row(`   ${BY}-l${RST}  ${DG}--list${RST}   ${DG}>>  ${DIM}${W}Show all supported platforms${RST}`),
        row(`   ${BY}-h${RST}  ${DG}--help${RST}   ${DG}>>  ${DIM}${W}Show this help${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Note${RST}`),
        mid,
        row(`   ${DIM}${W}Always wrap URLs in quotes in PowerShell${RST}`),
        row(`   ${DIM}${W}e.g. node osaint.js ${C}"https://..."${RST}`),
        top, '',
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
        row(`   ${BY}--help${RST}    ${DG}${BY}-h${RST}  ${DG}>>  ${DIM}${W}Quick usage guide${RST}`),
        row(`   ${BY}--howto${RST}   ${BY}--how${RST}${DG}>>  ${DIM}${W}Detailed guide per platform${RST}`),
        row(`   ${BY}--commands${RST} ${BY}--cmd${RST}${DG}>>  ${DIM}${W}This command list${RST}`),
        row(`   ${BY}--list${RST}    ${DG}${BY}-l${RST}  ${DG}>>  ${DIM}${W}Show supported platforms${RST}`),
        row(`   ${BY}--test${RST}         ${DG}>>  ${DIM}${W}Run self-test suite${RST}`),
        row(`   ${BY}--banner${RST}       ${DG}>>  ${DIM}${W}Preview all banner styles${RST}`),
        row(`   ${BY}--set-banner=N${RST} ${DG}>>  ${DIM}${W}Set banner to style N${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Analysis${RST}`),
        mid,
        row(`   ${C}<url>${RST}              ${DG}>>  ${DIM}${W}Analyze a share link${RST}`),
        row(`   ${C}<url>${RST} ${BY}--json${RST}       ${DG}>>  ${DIM}${W}Output as JSON${RST}`),
        row(`   ${C}<url>${RST} ${BY}--quiet${RST}      ${DG}>>  ${DIM}${W}No banner, just results${RST}`),
        row(`   ${C}<url>${RST} ${BY}-q --json${RST}    ${DG}>>  ${DIM}${W}Clean JSON only${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Note${RST}`),
        mid,
        row(`   ${DIM}${W}Always wrap URLs in ${C}"quotes"${DIM}${W} in PowerShell${RST}`),
        top, '',
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
        row(`   ${DIM}${W}When someone shares a link on social media, the${RST}`),
        row(`   ${DIM}${W}platform injects tracking data into the URL that${RST}`),
        row(`   ${DIM}${W}can reveal ${C}who shared it${DIM}${W}. OSAINT extracts this.${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Instagram${RST}  ${DG}>> igsh= parameter${RST}`),
        mid,
        row(`   ${DIM}${W}Tap Share >> Copy Link on any reel or post.${RST}`),
        row(`   ${DIM}${W}The ${C}?igsh=${DIM}${W} param is tied to the sharer's account.${RST}`),
        row(`   ${DIM}${W}Returns: ${C}username, user ID, name, avatar${RST}`),
        row(`   ${DG}Ex: ${DIM}${C}instagram.com/reel/abc/?igsh=MXdxazJ5...${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Discord${RST}  ${DG}>> invite code${RST}`),
        mid,
        row(`   ${DIM}${W}Click Invite People >> Copy in any server.${RST}`),
        row(`   ${DIM}${W}The invite code maps to the inviter's account.${RST}`),
        row(`   ${DIM}${W}Returns: ${C}username, user ID, avatar, created date${RST}`),
        row(`   ${DG}Ex: ${DIM}${C}discord.gg/r5Kx7Gp${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}TikTok${RST}  ${DG}>> short link tracking${RST}`),
        mid,
        row(`   ${DIM}${W}Tap Share >> Copy Link on any video.${RST}`),
        row(`   ${DIM}${W}The short URL embeds sharer data in redirect.${RST}`),
        row(`   ${DIM}${W}Returns: ${C}username, name, share token, timestamp${RST}`),
        row(`   ${DG}Ex: ${DIM}${C}vm.tiktok.com/ZMkGYwJUa/${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Twitch${RST}  ${DG}>> clip creator via GQL API${RST}`),
        mid,
        row(`   ${DIM}${W}Click Share on any clip.${RST}`),
        row(`   ${DIM}${W}The clip URL reveals who ${C}captured${DIM}${W} the clip.${RST}`),
        row(`   ${DIM}${W}Returns: ${C}clipper username, user ID, channel${RST}`),
        row(`   ${DG}Ex: ${DIM}${C}clips.twitch.tv/FunnyClipSlug-abc123${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Microsoft${RST}  ${DG}>> email in URL (offline)${RST}`),
        mid,
        row(`   ${DIM}${W}Click Share >> Copy Link on a SharePoint file.${RST}`),
        row(`   ${DIM}${W}The sharer's email is encoded in the URL path.${RST}`),
        row(`   ${DIM}${W}Returns: ${C}email address${RST}  ${DG}(no HTTP needed)${RST}`),
        row(`   ${DG}Ex: ${DIM}${C}company-my.sharepoint.com/.../jane_doe_co_com/${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Telegram${RST}  ${DG}>> creator ID from hash (offline)${RST}`),
        mid,
        row(`   ${DIM}${W}Create an invite link in a group.${RST}`),
        row(`   ${DIM}${W}The hash decodes to the creator's numeric ID.${RST}`),
        row(`   ${DIM}${W}Returns: ${C}creator user ID${RST}  ${DG}(no HTTP needed)${RST}`),
        row(`   ${DG}Ex: ${DIM}${C}t.me/joinchat/BgFGOkI4OTk${RST}`),
        mid,
        row(`${DG}>>${RST} ${W}Also Supported${RST}`),
        mid,
        row(`   ${DG}>>${RST} ${W}Perplexity${RST}  ${DG}Thread author from search URL${RST}`),
        row(`   ${DG}>>${RST} ${W}Pinterest${RST}   ${DG}Sender from pin.it invite code${RST}`),
        row(`   ${DG}>>${RST} ${W}Substack${RST}    ${DG}Referring user from ?r= param${RST}`),
        row(`   ${DG}>>${RST} ${W}Suno${RST}        ${DG}Sharer handle from share code${RST}`),
        row(`   ${DG}>>${RST} ${W}Reddit${RST}      ${DG}Sharer from /r/<sub>/s/<id> link${RST}`),
        top, '',
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
};

function fmtLabel(key) {
    return (LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
}

function fmtValue(key, value) {
    if (typeof value === 'boolean') return value ? `${G}Yes${RST}` : `${R}No${RST}`;
    if (typeof value === 'number') return `${W}${value.toLocaleString()}${RST}`;
    let s = String(value);
    const MAX_VAL = 35;
    if (s.startsWith('http')) {
        if (s.length > MAX_VAL) s = s.substring(0, MAX_VAL - 3) + '...';
        return `${C}${s}${RST}`;
    }
    if (s.length > MAX_VAL) s = s.substring(0, MAX_VAL - 3) + '...';
    return `${W}${s}${RST}`;
}

// ─── BANNER PREVIEWS ─────────────────────────────────────────────────────────

export function showBannerPreviews() {
    const top = line('=');
    const mid = line('-');
    const sub = row(`   ${DG}Share Link Intelligence${RST}              ${DIM}${DG}v1.0.0${RST}`);
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
        console.log(top);
    }
    console.log('');
    console.log(`   ${DG}Set banner: ${W}node osaint.js --set-banner=<number>${RST}`);
    console.log('');
}

export { line, row, empty, BOX_W, displayName };
