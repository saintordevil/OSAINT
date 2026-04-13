# OSAINT

Share Link Intelligence -- reveal who shared a link by analyzing the tracking parameters platforms inject into share URLs.

When someone taps "Copy Link" or "Share" on social media, the platform embeds tracking data in the URL that ties back to the sharer's account. OSAINT extracts this data.

## Supported Platforms

| Platform | What it reveals | How |
|---|---|---|
| **TikTok** | Username, name, avatar, followers, private status | `shareUser` data from mobile page render |
| **Instagram** | Username, user ID, name, avatar | `igsh` parameter / embedded page JSON |
| **Discord** | Username, user ID, avatar, account creation date | Public invite API |
| **Claude** | Display name, user UUID | Chat snapshots API |
| **Perplexity** | Username, avatar, user ID | Thread REST API |
| **Microsoft** | Email address | Decoded from SharePoint URL path (offline) |
| **Pinterest** | Username, user ID, name, avatar | Invite metadata API |
| **Substack** | User ID, name, handle, bio, photo | Referral parameter in page preloads |
| **Suno** | Username, name, avatar | Share code API |
| **Telegram** | Creator user ID | Base64 decoded from joinchat hash (offline) |
| **Twitch** | Clip creator username, user ID, channel | Twitch GQL API |
| **Reddit** | Sharer username, subreddit, post ID | Mobile share link redirect |

## Requirements

- Node.js 18+
- Windows / macOS / Linux
- **PowerShell** or **Windows Terminal** recommended on Windows (cmd.exe may not display animations correctly)

## Install

```bash
git clone https://github.com/saintordevil/OSAINT.git
cd OSAINT
npm install
```

## Usage

Always wrap URLs in quotes (required in PowerShell due to `&` characters).

```bash
# Analyze a share link
node osaint.js "https://vm.tiktok.com/abc123/"
node osaint.js "https://www.instagram.com/reel/abc/?igsh=xyz"
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
node osaint.js --animations      # Preview all 60 animation styles
node osaint.js --set-loading=N   # Set the active/scanning animation
node osaint.js --set-idle=N      # Set the completed/idle animation
```

## How It Works

Each platform handles share links differently:

- **TikTok** -- Short links (`vm.tiktok.com`) redirect through TikTok's servers. When fetched with a mobile User-Agent, TikTok embeds the sharer's full profile in the page HTML under `webapp.reflow.global.shareUser`. Only works if the sharer has "Display profile when sharing links" enabled in their privacy settings.

- **Instagram** -- The `igsh` parameter in share URLs is a tracking ID tied to the sharer's account. Instagram embeds the sharer's profile in the page response via `xdt_get_relationship_for_shid_logged_out`. Availability varies per share and is controlled server-side.

- **Discord** -- Invite codes are resolved via Discord's public API (`/api/v9/invites/{code}`), which returns the inviter's username, ID, avatar, and account creation date (decoded from the snowflake ID).

- **Claude** -- Share links are resolved via the `chat_snapshots` API endpoint, which returns the creator's display name and UUID. Uses TLS fingerprint impersonation to bypass CloudFlare.

- **Microsoft SharePoint** -- The sharer's email is encoded directly in the URL path as `first_last_domain_tld`. Decoded offline with no HTTP request needed.

- **Telegram** -- The joinchat hash is base64-encoded. The first 4 bytes decode to the group creator's numeric user ID. No HTTP request needed.

- **Twitch** -- Clip URLs are resolved via Twitch's public GQL API, which returns the clip creator's (clipper's) username and user ID.

## Technical Details

- Uses `node-tls-client` for Chrome TLS fingerprint impersonation to bypass CloudFlare and bot detection
- Mobile Android User-Agent for TikTok (required -- TikTok only serves sharer data to mobile browsers)
- 60 customizable spinner animations sourced from `unicode-animations` and `rattles` (braille grids, ASCII spinners, arrows, emoji)
- 13 swappable ASCII art banner styles
- All settings persist to `.osaint-config.json`

## Privacy Notes

- This tool only analyzes publicly accessible data embedded in share URLs
- No authentication or login is required
- Some platforms allow users to disable share tracking in their privacy settings (e.g., TikTok's "Display profile when sharing links")
- For educational and research purposes only

## License

MIT
