# OSAINT

Share Link Intelligence: reveal public account identifiers embedded in share, invite, profile, and booking links across 50 supported modules.

When someone taps "Copy Link" or "Share", some platforms add sender tracking fields. Other public link types expose the account, host, organizer, booking owner, or clip creator tied to the copied link. OSAINT extracts only public identifiers from those links and rejects normal content URLs that do not expose a link-tied account.

OSAINT currently includes **50 modules**. The full supported platform list is below, roughly ordered from most popular to least popular by parent platform reach and mainstream usage.

## Supported Platforms

| Platform | What it reveals | How |
|---|---|---|
| **YouTube Clips** | Clip creator display name, clip ID | `Clipped by` metadata on public clip pages |
| **WhatsApp** | Phone/account ID | `wa.me` / click-to-chat link path |
| **Instagram** | Username, user ID, name, avatar | `igsh` parameter / embedded page JSON |
| **TikTok** | Username, name, avatar, followers, private status | `shareUser` data from mobile page render |
| **Telegram** | Creator user ID | Base64 decoded from joinchat hash (offline) |
| **Spotify Wrapped** | Sender display name, sender image, share-card metadata | `shareData.sender_name` in public Wrapped share pages |
| **Reddit** | Sharer username, subreddit, post ID | Mobile share link redirect |
| **Discord** | Username, user ID, avatar, account creation date | Public invite API |
| **Pinterest** | Username, user ID, name, avatar | Invite metadata API |
| **Twitch** | Clip creator username, user ID, channel | Twitch GQL API |
| **Google Photos** | Shared album owner Google account ID, name, avatar when exposed | `(Owner)` actor marker in public shared album page |
| **Microsoft Teams** | Organizer user object ID, tenant ID | Embedded `context` parameter in meeting invite URLs |
| **Microsoft** | Email address | Decoded from SharePoint URL path (offline) |
| **OneDrive Personal** | Owner CID / account container ID | `cid` / `resid` parameters in personal OneDrive links |
| **Baidu Pan** | Sharer user ID / profile URL | `uk` parameter in old Netdisk share URLs |
| **Bilibili** | Sharer user ID / profile URL | `mid` / `share_mid` parameters in app share URLs |
| **Xiaohongshu** | Sharer user ID / share identity token | `appuid` / `shareRedId` parameters in app share URLs |
| **NetEase Music** | Sharer user ID, name, avatar | `userid` parameter and public user API |
| **Steam Trade** | Steam account ID, SteamID64, trade token | `partner` / `token` parameters in user-created trade URLs |
| **PayPal.Me** | Payment profile handle, display metadata when public | Profile path and public page metadata |
| **Cash App** | Cashtag / payment profile | `$cashtag` path |
| **Venmo** | Username or user ID | `/u/{username}` and QR `user_id` links |
| **Linktree** | Profile handle, display metadata when public | Profile path and public metadata |
| **Patreon** | Creator handle, display metadata when public | Creator profile path and public metadata |
| **Substack** | User ID, name, handle, bio, photo | Referral parameter in page preloads |
| **Zhihu** | Legacy sharer profile slug | decoded `utm_member` parameter |
| **Claude** | Display name, user UUID | Chat snapshots API |
| **Perplexity** | Username, avatar, user ID | Thread REST API |
| **Suno** | Username, name, avatar | Share code API |
| **Loom** | Recording owner user ID, name, avatar | Apollo page state |
| **Medal.tv** | Clip recorder/poster user ID, name, avatar | JSON-LD and page payload |
| **Eventbrite** | Organizer name, profile, and account ID when exposed | JSON-LD or public event page data |
| **Meetup** | Group/organizer slug, event ID, host metadata | Event URL path and JSON-LD |
| **Calendly** | Booking owner slug, display metadata when public | Scheduling link path and page metadata |
| **Cal.com** | Booking owner username, name, avatar | Public OG image params and page metadata |
| **Lu.ma** | Event host user ID, name, avatar, socials | Public event page data |
| **Partiful** | Event host or owner user ID, name/avatar/socials when exposed | Public event invite page data |
| **Beacons** | Profile handle, display metadata when public | Profile path and public metadata |
| **Ko-fi** | Creator handle, display name/avatar when public | Profile path and public page metadata |
| **Buy Me a Coffee** | Creator handle, display name/avatar when public | Profile path and public page metadata |
| **QQ Contact** | QQ account number | `uin` parameter in WPA links |
| **TidyCal** | Booking owner slug/name | Booking link path and title metadata |
| **YouCanBookMe** | Booking owner subdomain | Booking-page subdomain and page metadata |
| **SavvyCal** | Booking owner slug, display metadata when public | Booking link path and page metadata |
| **Acuity Scheduling** | Owner account ID | `owner` parameter in schedule links |
| **Ticket Tailor** | Box-office owner slug, event ID | Event URL path |
| **Humanitix** | Event host/organizer name when public | JSON-LD public event page data |
| **Eventzilla** | Organizer name/profile when public | JSON-LD public event page data |
| **TicketLeap** | Organizer slug, event ID | Event URL path |
| **Universe** | Organizer name/profile when public | JSON-LD / public event page data |

## Requirements

- Node.js 18+
- Windows / macOS / Linux
- On Windows, **Windows Terminal with the Command Prompt profile** is recommended for the cleanest box drawing, redraws, and line spacing.
- PowerShell works for normal output, but it can render live redraws and wrapped box lines less cleanly.

## Install

```bash
git clone https://github.com/saintordevil/OSAINT.git
cd OSAINT
npm install
```

## Usage

On Windows, open Windows Terminal and choose the Command Prompt profile, then run OSAINT from there for the cleanest terminal UI.

Always wrap URLs in quotes. This is especially important in PowerShell because `&` characters are parsed as command separators.

```bash
# Analyze a share link
node osaint.js "https://vm.tiktok.com/abc123/"
node osaint.js "https://www.instagram.com/reel/abc/?igsh=xyz"
node osaint.js "https://www.xiaohongshu.com/explore/abc?appuid=xyz"
node osaint.js "https://www.bilibili.com/video/BV...?mid=123456"
node osaint.js "https://pan.baidu.com/share/link?shareid=123&uk=456"
node osaint.js "https://music.163.com/song/123/?userid=456"
node osaint.js "https://www.zhihu.com/question/123?utm_member=..."
node osaint.js "https://www.spotify.com/wrapped-share/0123456789abcdef0123456789abcdef"
node osaint.js "https://youtube.com/clip/Ugkx..."
node osaint.js "https://photos.app.goo.gl/abc123"
node osaint.js "https://partiful.com/e/abc123def456"
node osaint.js "https://lu.ma/abc123"
node osaint.js "https://www.eventbrite.com/e/example-tickets-1234567890"
node osaint.js "https://teams.microsoft.com/l/meetup-join/..."
node osaint.js "https://wa.me/447577138632"
node osaint.js "https://steamcommunity.com/tradeoffer/new/?partner=123456&token=abcdEF12"
node osaint.js 'https://cash.app/$example'
node osaint.js "https://cal.com/baseline"
node osaint.js "https://tidycal.com/example/15-minute-meeting"
node osaint.js "https://www.tickettailor.com/events/example/123456"
node osaint.js "https://events.humanitix.com/example-event"
node osaint.js "https://www.loom.com/share/696fb088168d43f4ac339d3043065869"
node osaint.js "https://discord.gg/invite123"

# JSON output (for scripting)
node osaint.js "https://vm.tiktok.com/abc123/" --json

# Quiet mode (no banner)
node osaint.js "https://vm.tiktok.com/abc123/" -q

# Clean JSON only
node osaint.js "https://vm.tiktok.com/abc123/" -q --json
```

## Commands

```bash
node osaint.js --help            # Quick usage guide
node osaint.js --howto           # Detailed guide per platform
node osaint.js --commands        # Full command list
node osaint.js --list            # Show all supported platforms
node osaint.js --test            # Run self-test suite

# Banner customization
node osaint.js --banner          # Preview all 13 banner styles
node osaint.js --set-banner=N    # Set banner to style N

# Animation customization
node osaint.js --animations      # Preview all 52 animation styles
node osaint.js --anim-demo=N     # Live demo of a specific animation
node osaint.js --set-loading=N   # Set the active/scanning animation
node osaint.js --set-idle=N      # Set the completed/idle animation
```

## How It Works

Different platforms expose link-tied account data in different ways. These are the main social modules:

- **Instagram**: The `igsh` parameter in share URLs is a tracking ID tied to the sharer's account. Instagram can embed the sharer's profile in the page response via `xdt_get_relationship_for_shid_logged_out`. Availability varies per share and is controlled server-side.

- **TikTok**: Short links (`vm.tiktok.com`) redirect through TikTok's servers. When fetched with a mobile User-Agent, TikTok can embed the sharer's profile in the page HTML under `webapp.reflow.global.shareUser`. This only works if the sharer has "Display profile when sharing links" enabled in privacy settings.

- **Spotify Wrapped**: Public Wrapped share links expose a `shareData.sender_name` field in the page payload, along with sender image and share-card metadata. OSAINT only supports Wrapped share links and intentionally rejects normal track, artist, album, and playlist URLs because their `si` and `dlsi` tokens have not been verified to expose the sharer.

- **Discord**: Invite codes are resolved through Discord's public invite API, which can return the inviter's username, ID, avatar, and account creation date decoded from the snowflake ID.

- **Telegram**: Some legacy `joinchat` hashes are base64-encoded. The first 4 bytes can decode to the invite creator's numeric user ID. No HTTP request is needed.

## Technical Details

- Uses `node-tls-client` for Chrome TLS fingerprint impersonation to bypass CloudFlare and bot detection
- Mobile Android User-Agent for TikTok, required because TikTok only serves sharer data to mobile browsers
- Managed real-time terminal region keeps completed steps stable and the active operation on the bottom row
- 52 customizable spinner animations sourced from `unicode-animations` and `rattles` (braille grids, ASCII spinners, braille patterns)
- 13 swappable ASCII art banner styles
- All settings persist to `.osaint-config.json`

## Privacy Notes

- This tool only analyzes publicly accessible data embedded in share URLs
- No authentication or login is required
- Some platforms allow users to disable share tracking in their privacy settings (e.g., TikTok's "Display profile when sharing links")
- For educational and research purposes only

## License

MIT
