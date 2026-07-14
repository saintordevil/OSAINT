# OSAINT

OSAINT is a command-line link-attribution tool for public share, invite, profile, booking, event, and clip URLs. It extracts identifiers exposed by a supported link and labels the relationship between that identity and the link.

The distinction matters. A result can describe the actual sharer, a referral account, an invite creator, a clip creator, a content owner, an event host, or the target of a profile link. OSAINT reports this as `identity_role` and reserves `actual_sharer` for formats with a proven sender-attribution field. `is_sharer_identity` is `true` for sharer and referral semantics, and `false` for contextual identities such as owners, organizers, targets, and artifact creators.

A URL is evidence of what it encodes, not proof that the URL is authentic. Query parameters and path IDs can be edited manually. Preserve the original source and corroborate important identity conclusions independently.

## What changed in 2.0.0

- Added Stack Exchange built-in `/q/{post}/{user}` and `/a/{post}/{user}` share links. Stack Exchange appends the clicking account's ID when it builds this URL, but the unsigned path remains editable, so OSAINT labels it `referral_account` rather than proof of the sender. Public API enrichment is optional.
- Corrected YouTube output to identify the legacy Clip creator, not a later person who forwarded the URL. Ordinary Watch, Shorts, and `si` links remain unsupported.
- Removed Telegram invite hashes from routing. Current invite hashes are opaque and cannot be decoded safely into a public creator ID.
- Added explicit attribution roles across all modules.
- Hardened URL parsing against lookalike hosts, embedded URLs, credentials, unsafe redirects, unbounded downloads, and stalled requests.
- Removed cosmetic delays from non-interactive and JSON runs, and ensured TLS workers shut down after every command.
- Expanded regression tests for routing, parsers, terminal safety, redirect handling, exit codes, and attribution semantics.

### 2.0 migration notes

- Results now include `identity_role` and `is_sharer_identity`, so integrations can distinguish sharer/referral signals from contextual accounts.
- Input artifact links previously mislabeled as `profile_url` now use `share_url`. A returned `profile_url` points to an identity profile.
- Microsoft SharePoint output now preserves `site_slug` and labels the derived address as `email_candidate`; it no longer presents the heuristic as a verified email.
- Telegram invite hashes are no longer routed because current hashes are opaque.
- These schema and routing corrections are why this release uses a major version.

## Supported modules

OSAINT includes 50 routed modules. “Role” is the meaning of the identity returned, not a guarantee that every live page will expose every optional field.

| Platform | Role | Public signal |
|---|---|---|
| **Stack Exchange** | `referral_account` | Editable, unsigned user ID appended by built-in `/q/` and `/a/` Share links |
| **Spotify Wrapped** | `actual_sharer` | `shareData.sender_name` and related public Wrapped card data |
| **Instagram** | `sharer_account` | Account data associated with an `igsh` share token when exposed |
| **TikTok** | `sharer_account` | Mobile share-page `shareUser` payload when profile sharing is enabled |
| **Xiaohongshu / RED** | `sharer_account` | Valid `appuid` on a content URL with a companion app-share marker; `shareRedId` alone is metadata, not an account ID |
| **Bilibili** | `sharer_account` | Numeric `mid` or `share_mid` on a content URL with a companion app-share marker |
| **NetEase Music** | `sharer_account` | `userid` on a recognized content route with a content ID; profile enrichment is best effort |
| **Zhihu** | `sharer_account` | Valid legacy `utm_member` value |
| **Pinterest** | `sharer_account` | Public invite metadata associated with a `pin.it` share |
| **Substack** | `referral_account` | Referral account in note preload data |
| **Suno** | `sharer_account` | Public account associated with a Suno share code |
| **Reddit** | `sharer_signal` | Experimental: emits only when a `/r/{subreddit}/s/{id}` response explicitly exposes a sharer field; current public links commonly fail closed |
| **Discord** | `invite_creator` | Inviter object returned by the public invite API when available |
| **Claude** | `share_creator` | Creator metadata on a public shared conversation |
| **Perplexity** | `thread_author` | Author metadata on a public search thread |
| **YouTube Clips** | `clip_creator` | `clipAttributionRenderer` on an existing Clip page |
| **Twitch Clips** | `clip_creator` | Clipper account returned by Twitch clip data |
| **Google Photos** | `album_owner` | Owner actor exposed by a public shared album |
| **Partiful** | `event_host` | Host account exposed by a public event invite |
| **Lu.ma** | `event_host` | Host account exposed by a public event page |
| **Eventbrite** | `event_organizer` | Organizer metadata exposed by a public event page |
| **Microsoft Teams** | `meeting_organizer` | Organizer and tenant IDs in the meeting `context` field |
| **Microsoft SharePoint** | `sharepoint_owner` | Personal-site slug and a clearly labeled heuristic email candidate |
| **WhatsApp** | `recipient_account` | Phone number targeted by a click-to-chat URL |
| **QQ Contact** | `recipient_account` | QQ number targeted by a WPA contact URL |
| **Steam Trade** | `trade_offer_owner` | Account ID and token in a user-created trade-offer URL |
| **OneDrive Personal** | `storage_owner` | Personal storage CID or resource owner container |
| **Baidu Pan** | `share_owner` | `uk` value in supported legacy Netdisk share links |
| **Cash App** | `profile_target` | Cashtag in a payment profile URL |
| **Venmo** | `profile_target` | Username or user ID in a profile or QR URL |
| **PayPal.Me** | `profile_target` | Payment profile handle and public metadata |
| **Ko-fi** | `profile_target` | Creator profile handle and public metadata |
| **Buy Me a Coffee** | `profile_target` | Creator profile handle and public metadata |
| **Patreon** | `profile_target` | Creator profile handle and public metadata |
| **Linktree** | `profile_target` | Profile handle and public metadata |
| **Beacons** | `profile_target` | Profile handle and public metadata |
| **Calendly** | `booking_owner` | Scheduling owner slug and public metadata |
| **Cal.com** | `booking_owner` | Scheduling owner username and public metadata |
| **TidyCal** | `booking_owner` | Booking owner slug and public title metadata |
| **YouCanBookMe** | `booking_owner` | Booking owner subdomain and public metadata |
| **SavvyCal** | `booking_owner` | Booking owner slug and public metadata |
| **Acuity Scheduling** | `booking_owner` | Numeric `owner` value in a scheduling URL |
| **Ticket Tailor** | `event_organizer` | Box-office owner slug and event ID |
| **Humanitix** | `event_organizer` | Organizer metadata on a public event page |
| **Meetup** | `event_organizer` | Group, event, and host metadata on a public event page |
| **TicketLeap** | `event_organizer` | Organizer slug and event ID in the event URL |
| **Eventzilla** | `event_organizer` | Organizer metadata on a public event page |
| **Universe** | `event_organizer` | Organizer metadata on a public event page |
| **Loom** | `recording_owner` | Recording owner metadata in public page state |
| **Medal.tv** | `clip_creator` | Recorder or poster metadata in public clip data |

## Deliberately unsupported cases

- **Ordinary YouTube links:** Watch, Shorts, and `si` parameters do not publicly resolve to the person who forwarded the URL. Existing YouTube Clip pages can expose the person who created the Clip artifact. YouTube [retired creation of new Clips in April 2026](https://support.google.com/youtube/answer/10332730?hl=en-gb), but existing Clip URLs remain viewable.
- **Telegram invite links:** Current invite hashes are opaque lookup values. Telegram's public invite-check result does not expose the invite creator. OSAINT rejects these instead of guessing an ID from arbitrary Base64 bytes.
- **Ordinary Spotify links:** Track, album, artist, playlist, `si`, and `dlsi` values are not treated as sender identities. Only the distinct public Wrapped share-card format is routed.
- **Owner-only content URLs:** A normal post or media URL is not treated as sharer evidence merely because it contains the original creator's username.

## Requirements

- Node.js 20 or newer
- Windows, macOS, or Linux
- Windows Terminal with the Command Prompt profile is recommended on Windows for the cleanest box drawing and animation redraws

## Install

```bash
git clone https://github.com/saintordevil/OSAINT.git
cd OSAINT
npm install
```

## Usage

Always wrap URLs in quotes. This is required in shells that treat `&` as a command separator.

```bash
# An unsigned Stack Exchange referral-account field
node osaint.js "https://stackoverflow.com/q/11828270/819887"

# Link-tied sharer or referral signals
node osaint.js "https://www.instagram.com/reel/example/?igsh=example"
node osaint.js "https://www.bilibili.com/video/BVexample?mid=123456&share_session_id=example"
node osaint.js "https://music.163.com/song/123/?userid=456"

# Contextual identities, labeled by role
node osaint.js "https://youtube.com/clip/Ugkx..."
node osaint.js "https://teams.microsoft.com/l/meetup-join/..."
node osaint.js "https://wa.me/447700900000"

# Automation-friendly output
node osaint.js "https://stackoverflow.com/q/11828270/819887" --json
node osaint.js "https://stackoverflow.com/q/11828270/819887" -q --json
```

Example JSON shape:

```json
{
  "user_id": "819887",
  "identity_role": "referral_account",
  "is_sharer_identity": true,
  "identity_confidence": "unsigned_url_claim",
  "account_validation": "api_confirmed",
  "post_validation": "api_confirmed",
  "share_source": "built-in-share-referrer"
}
```

Network enrichment is best effort. Stack Exchange confirms the account and referenced post when its public API is reachable, rejects confirmed missing IDs, and reports validation status. A parser can still return an offline ID from a structurally valid link when optional public metadata is unavailable.

## Commands

```bash
node osaint.js --help
node osaint.js --howto
node osaint.js --commands
node osaint.js --list
node osaint.js --test

node osaint.js --banner
node osaint.js --set-banner=N
node osaint.js --animations
node osaint.js --anim-demo=N
node osaint.js --set-loading=N
node osaint.js --set-idle=N
```

## Safety and reliability

- Routing parses the URL once, requires HTTPS, and accepts only exact supported hosts and paths. Lookalike domains, embedded target URLs, fragments, credentials, and other schemes are rejected.
- Native HTTP requests have a 15-second total timeout, a streaming 5 MiB download cap, and a five-redirect limit. Short-link modules restrict redirects to expected platform hosts.
- TLS-fingerprint request chains share a 15-second budget, with cold-start initialization deducted before the request is issued, and reject bodies over 5 MiB before parsing. The current `node-tls-client` API materializes a response before OSAINT can measure it, so that TLS limit is a post-buffer acceptance cap rather than a streaming memory bound.
- Native HTTP requests preflight resolved addresses and reject local, private, link-local, multicast, and documentation ranges. This reduces SSRF risk but is not DNS pinning; fixed platform allowlists remain the primary trust boundary.
- Dynamic parsers fail closed when a response contains metadata but no attributable identity.
- Terminal text is stripped of control sequences before display.
- Non-interactive and JSON modes have no cosmetic spinner delay.
- Shared TLS workers are closed on success, parser errors, self-tests, signals, and uncaught failures.
- OSAINT uses only publicly accessible data and does not require authentication.

## Research notes

Current public probing also examined Quora, Wattpad, Kwai/Kuaishou, Douyin, Kick, Snapchat, LINE, WeChat, Lemon8, and other large platforms. Promising-looking values were not added unless their account semantics and a safe public resolution path could be demonstrated. Opaque analytics, device, install, campaign, and per-share tokens are not identities.

## License

MIT
