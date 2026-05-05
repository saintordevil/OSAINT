# YouTube and Spotify Share URL Research Handoff

Date: 2026-05-05

Project: `C:\Users\saint\Desktop\Programs\OSAINT`

Goal: find URL parameters or public endpoints that reveal the actual person who shared a URL, not the content owner, author, uploader, playlist owner, artist, or channel.

Strict success rule:

- A module is only valid if the URL or a public endpoint can return a username, display name, account ID, profile URL, avatar, or similar identifier for the actual sharer.
- Content owner metadata is not enough.
- Random links generated without being logged in are not useful for proving sharer attribution.
- User-supplied URLs must be used for YouTube and Spotify tests.

## Exact URLs Tested

### YouTube

Browser share URL:

```text
https://youtu.be/9_pGtoazuSc?si=23gLArT_zXKhlYBh
```

Mobile share URL:

```text
https://youtu.be/E27-IDwnhnY?si=p7FQfkwP0NTwOihw
```

### Spotify

Track, shared by user, famous artist song:

```text
https://open.spotify.com/track/2prqm9sPLj10B4Wg0wE5x9?si=e98015d9626d4ffc
```

Artist profile:

```text
https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH?si=910364c95fdc4362
```

Random track:

```text
https://open.spotify.com/track/6sKr3450XtdB6xS4y1XbkM?si=e46f8be4b30041c8
```

Playlist shared by someone else, where `Tori` is the playlist owner, not the sharer:

```text
https://open.spotify.com/playlist/5EainjSN9gBbm2L7YzlUsR?go=1&sp_cid=5b2987d8f6445a4e836ee3cb02abd98c&utm_source=embed_player_p&utm_medium=desktop&nd=1&dlsi=058d65493af24ff7
```

## OSAINT Project Context Read

The project is a Node.js CLI that detects URL platforms in `src/router.js`, loads one module per platform from `src/modules/*.js`, and prints either JSON or formatted terminal output.

Relevant architecture:

- `osaint.js` handles CLI flags, platform detection, module loading, analysis, JSON output, and formatted output.
- `src/router.js` maps URL regexes to module names.
- `src/banner.js` formats supported platform lists, how-to text, labels, result boxes, and error boxes.
- Each module returns either `{ data: ... }` or `{ error: ... }`.

Existing strict pattern:

- Modules should expose the actual sharer.
- If the platform does not provide sharer metadata, the module should return an error.
- Do not treat content owner, uploader, artist, playlist owner, or poster as the sharer.

## Automated Research Harness Added

I added a reproducible research harness instead of adding unsupported YouTube or Spotify modules.

New files:

```text
scripts/research-share-leaks.js
src/research/collectors.js
src/research/classifyCandidate.js
src/research/controls.js
src/research/htmlExtract.js
src/research/httpProbe.js
src/research/jsonScan.js
src/research/tokenUtils.js
test/research-share-leaks.test.js
fixtures/youtube/unsupported-si.json
fixtures/spotify/unsupported-si.json
fixtures/spotify/playlist-owner-false-positive.json
fixtures/spotify/generated-share-false-positive.json
```

What the harness does:

- Extracts YouTube `si` and `pp`, Spotify `si`, `sp_cid`, `dlsi`, Branch referrer values, and content IDs.
- Builds exact, token-removed, same-shape random-token, and one-character mutation controls.
- Fetches desktop and mobile public pages without cookies or auth.
- Extracts OpenGraph, Twitter card, canonical/app links, inline JSON, YouTube `ytInitialData`, `ytInitialPlayerResponse`, `ytcfg`, and Spotify app-state blobs.
- Runs YouTube oEmbed, canonical watch, mobile watch, and public Innertube probes around `navigation/resolve_url`, `player`, `next`, and `share/get_share_panel`.
- Runs Spotify oEmbed, embed, URL dispenser, page-state scanning, and public bundle string mining for sharing/referrer/inviter terms.
- Imports HAR files for browser trace analysis with `--har`.
- Optionally supports `--transport tls-client` or `--transport auto`, while the default path remains native fetch.
- Redacts cookies, authorization, Set-Cookie, visitor data, remote host values, and anonymous bearer-token-shaped values from evidence.
- Classifies identity-shaped fields as strict sharer, content owner, current viewer, generated share, analytics/session/device/campaign, or unknown.

Important module decision:

- No `src/modules/youtube.js` was added.
- No `src/modules/spotify.js` was added.
- Normal OSAINT router and supported platform list remain unchanged for these platforms.

## Automated Harness Results

Evidence bundles were generated locally under:

```text
C:\Users\saint\Desktop\Programs\OSAINT\research-runs\
```

The directory is intentionally ignored by git because it contains large reproducible evidence output.

Evidence policy:

- Exact supplied share/tracking tokens are retained because they are the proof target.
- Cookies, authorization headers, Set-Cookie values, visitor data, remote host values, and bearer-token-shaped session values are redacted.

Summary from the exact supplied URLs:

| Input | Requests | Strict sharer identities | Result |
| --- | ---: | ---: | --- |
| YouTube `9_pGtoazuSc` with `si=23gLArT_zXKhlYBh` | 52 | 0 | `no_strict_sharer_found` |
| YouTube `E27-IDwnhnY` with `si=p7FQfkwP0NTwOihw` | 52 | 0 | `no_strict_sharer_found` |
| Spotify track `2prqm9sPLj10B4Wg0wE5x9` with `si=e98015d9626d4ffc` | 20 | 0 | `no_strict_sharer_found` |
| Spotify artist `6qqNVTkY8uBg9cP3Jd7DAH` with `si=910364c95fdc4362` | 20 | 0 | `no_strict_sharer_found` |
| Spotify track `6sKr3450XtdB6xS4y1XbkM` with `si=e46f8be4b30041c8` | 20 | 0 | `no_strict_sharer_found` |
| Spotify playlist `5EainjSN9gBbm2L7YzlUsR` with `sp_cid` and `dlsi` | 40 | 0 | `no_strict_sharer_found` |

YouTube note:

- This environment received Google `429` interstitials on some direct YouTube page-shell fetches.
- The harness still ran the required public Innertube endpoint matrix using the public web API key fallback.
- Innertube returned video, channel, player, next-page, visitor/session, and share-generation metadata, not a public sharer account.

Spotify note:

- Spotify page state and public responses exposed content, owner, generated share, session, analytics, and navigation fields.
- The playlist sample correctly rejected `Tori` as playlist owner/content metadata, not the person who shared the link.
- The playlist sample now tests `sp_cid` and `dlsi` independently, plus an all-tracking-tokens-removed control.

## Fix Applied For Duplicate Error Spam

Bug observed:

- When a module returned an error, the animated spinner path could print an error-related line, then the final error box also printed the module error.
- This could look like repeated spam for messages such as:

```text
Instagram did not include sharer profile data for this link
```

Fix:

- Removed the `s.fail('Analysis returned an error')` spinner failure line from module-returned errors in `osaint.js`.
- The module error is now printed once through `outputError(result.error)`.
- Modules were not changed for this bug.

Validation:

```powershell
cd C:\Users\saint\Desktop\Programs\OSAINT
npm test
node osaint.js "https://music.163.com/song/27971936/?id=27971936"
```

Captured validation showed the NetEase module error appeared exactly once.

Commit:

```text
9ca6bd6 Print module errors once
```

## Browser Trace And Capture Locations

Browser trace skill was used for passive CDP tracing and response inspection.

Trace folders created under:

```text
C:\Users\saint\.codex\skills\browser-trace\.o11y\
```

Relevant trace run names:

```text
osaint-youtube-share-si
osaint-youtube-share-panel-click
osaint-spotify-user-links
osaint-spotify-playlist-specific
```

Additional direct CDP response-body capture was run using a dedicated Chrome instance:

```text
--remote-debugging-port=9227
--user-data-dir=C:\tmp\chrome-osaint-deep-cdp
```

That Chrome instance was later stopped by matching its exact debug port and user-data-dir.

## YouTube Methods Tried

### 1. Direct URL Loading With Exact User URLs

Tested:

```text
https://youtu.be/9_pGtoazuSc?si=23gLArT_zXKhlYBh
https://youtu.be/E27-IDwnhnY?si=p7FQfkwP0NTwOihw
```

Observed:

- Desktop URL normalized to:

```text
https://www.youtube.com/watch?v=9_pGtoazuSc
```

- Mobile URL normalized to a mobile watch URL similar to:

```text
https://m.youtube.com/watch?v=E27-IDwnhnY&pp=...
```

Result:

- The `si` token was visible in the initial request path or original-request echoes only.
- The final watch page did not expose a sharer profile.
- No username, display name, Google account ID, channel ID, or profile URL linked to the sharer was found.

### 2. Raw HTML Source Inspection

Checked:

- Raw HTML source.
- Meta tags.
- OpenGraph tags.
- Inline scripts.
- Hydration data.
- `ytInitialData`.
- `ytInitialPlayerResponse`.
- `ytcfg`.
- Full-text search for the exact `si` tokens.
- Full-text search for identity-shaped fields such as `username`, `displayName`, `userId`, `channelId`, `profile`, `owner`, `sender`, and `share`.

Result:

- HTML contained video/page metadata, not sharer metadata.
- Any account/channel fields pointed to the video/channel/content context, not the person who shared the link.
- The original `si` token only appeared as request echo or page state noise.

### 3. Rendered DOM Inspection

Checked:

- DOM after JavaScript render.
- Visible page data.
- Hidden app state after load.
- Client storage related to the page.

Result:

- No sharer identity found.
- The page displayed video/channel data only.

### 4. Network Capture With Browser Trace

Captured network while opening exact YouTube URLs.

Checked:

- Requests.
- Response bodies.
- Redirect chain.
- Headers.
- Console activity.
- DOM dumps.
- Searchable CDP buckets produced by browser-trace.

Result:

- No endpoint response mapped `si` to the sharer.
- No response body exposed a user profile for the account that generated the link.

### 5. YouTube Share Panel Endpoint

Clicked/opened the YouTube share panel in browser trace.

Observed endpoint:

```text
https://www.youtube.com/youtubei/v1/share/get_share_panel?prettyPrint=false
```

Observed response:

- Status 200.
- Body contained a generated short URL like:

```text
https://youtu.be/9_pGtoazuSc?si=<fresh-token>
```

Important:

- This fresh token was generated by the browser during share panel inspection.
- It was not used as evidence for the user's original sharer.
- The endpoint generated a share URL but did not return the account/profile of the share creator.

Result:

- No `username`, `displayName`, `userId`, `channelId`, `sender`, or sharer profile field was returned.
- Endpoint appears useful for generating share links, not resolving existing `si` tokens to users.

### 6. YouTube Innertube Endpoint Variations

Checked public/internal endpoint classes around:

```text
youtubei/v1/player
youtubei/v1/next
youtubei/v1/share/get_share_panel
```

Also researched or attempted legacy/public variations:

```text
get_video_info
resolve_url style flows
oEmbed
YouTube Data API video lookup
```

Result:

- These endpoints return video, player, next-page, channel, or share-panel generation data.
- No endpoint returned sharer identity from `si`.
- Public YouTube Data API resources are centered on videos, channels, playlists, comments, etc. They do not document an `si` to sharer lookup.

### 7. User-Agent Variations

Tested or inspected behavior through:

- Desktop browser URL.
- Mobile URL.
- Browser-rendered page.
- Mobile-style user-agent behavior from the share URL context.

Result:

- User-agent differences affected page shape and canonical URL, but not sharer visibility.
- No user-agent made YouTube expose the sharer behind `si`.

### 8. Exact Token Public Web Search

Searched exact YouTube `si` tokens:

```text
23gLArT_zXKhlYBh
p7FQfkwP0NTwOihw
```

Result:

- No indexed public page was found that tied those exact tokens to a posting account.
- External correlation did not work for these examples.

### 9. Public Research And Code Search

Reviewed public references and issue discussions around YouTube `si`.

Sources and areas checked:

- Mozilla Bugzilla discussion of YouTube `si` tracking parameter.
- Brave issue discussion around YouTube `si`.
- ReVanced issue discussion around YouTube share tracking.
- YouTube.js endpoint source and Innertube coverage.
- Invidious/youtube-lookup style public tooling.
- YouTube Data API documentation.

Result:

- Public discussion consistently treats `si` as a tracking/share ID parameter.
- No public resolver was found that maps `si` back to a YouTube/Google account.

### YouTube Conclusion

No strict OSAINT module was added for YouTube.

Reason:

- All tested public and browser-observable paths returned video/channel/page/share-generation data only.
- The actual sharer mapping, if it exists, appears server-side and not publicly resolvable.
- Adding YouTube based on `si` would risk false attribution.

Current OSAINT behavior for the supplied YouTube URLs:

```json
{
  "error": "Unsupported URL. Use --list to see supported platforms."
}
```

## Spotify Methods Tried

### 1. Direct URL Loading With Exact User URLs

Tested:

```text
https://open.spotify.com/track/2prqm9sPLj10B4Wg0wE5x9?si=e98015d9626d4ffc
https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH?si=910364c95fdc4362
https://open.spotify.com/track/6sKr3450XtdB6xS4y1XbkM?si=e46f8be4b30041c8
https://open.spotify.com/playlist/5EainjSN9gBbm2L7YzlUsR?go=1&sp_cid=5b2987d8f6445a4e836ee3cb02abd98c&utm_source=embed_player_p&utm_medium=desktop&nd=1&dlsi=058d65493af24ff7
```

Checked:

- Redirects.
- Final URLs.
- HTML responses.
- Rendered app state.
- Network calls.
- Headers.
- Query parameter propagation.

Result:

- `si`, `sp_cid`, and `dlsi` were visible as query/analytics/navigation context.
- No public response mapped these values to the actual sharer account.

### 2. Spotify HTML And Hydration/App State

Checked:

- Initial HTML.
- Embedded app data.
- Hydrated client state.
- Search for exact `si`, `sp_cid`, and `dlsi` values.
- Search for identity fields near those values.

Result:

- Content metadata was present.
- Sharer identity was not present.
- Any profile/user fields found belonged to content context, recommendations, owner fields, or app state unrelated to the sharer.

### 3. Spotify Network Capture With Browser Trace

Captured browser network while opening exact Spotify links.

Checked:

- Requests.
- Response bodies.
- Redirects.
- Headers.
- Console events.
- DOM dumps.

Result:

- No endpoint returned a sharer profile for the exact URL parameters.
- The link parameters were mostly passed into analytics/navigation flows.

### 4. Spotify Pathfinder API

Observed and inspected calls to:

```text
https://api-partner.spotify.com/pathfinder/v2/query
```

Observed response classes:

- Track metadata.
- Artist metadata.
- Playlist metadata.
- Content owner/member/added-by fields.
- Sharing information generated for the current browser/content.

Important distinction:

- `sharingInfo.shareId` and `sharingInfo.shareUrl` refer to generated/current content sharing metadata, not the user-supplied sharer.
- These fields did not resolve the provided `si`, `sp_cid`, or `dlsi` to an account.

Result:

- No sharer account found.

### 5. Spotify Playlist Owner False Positive Check

Tested playlist URL:

```text
https://open.spotify.com/playlist/5EainjSN9gBbm2L7YzlUsR?go=1&sp_cid=5b2987d8f6445a4e836ee3cb02abd98c&utm_source=embed_player_p&utm_medium=desktop&nd=1&dlsi=058d65493af24ff7
```

Observed:

- Spotify responses returned playlist owner/member/added-by data for `Tori`.
- The owner/user URI seen in responses was playlist-owner context.

Result:

- Rejected as a module candidate because `Tori` is the playlist owner, not the sharer.
- This is exactly the false-positive class OSAINT must avoid.

### 6. Spotify Web API Comparison

Checked Spotify Web API documentation and behavior conceptually against available page data.

Relevant endpoint class:

```text
GET /v1/playlists/{playlist_id}
```

Result:

- Spotify Web API documents playlist owner fields.
- Owner fields are content-owner metadata.
- No documented Web API method maps `si`, `sp_cid`, or `dlsi` to a sharer account.

### 7. Spotify Link Expansion And Branch Deep Links

Checked Spotify link/deep-link behaviors involving:

```text
spotify.link
spotify.app.link
_branch_referrer
_branch_match_id
```

Decoded observed Branch referrer payloads during probing.

Decoded payloads were only:

```text
https://spotify.link/H6FTskvicDb
https://spotify.link/r9O77qx5vXb?~referring_browser=Chrome
```

Result:

- Branch data described link/navigation context.
- No sharer account was exposed.
- No public Branch endpoint resolved the Spotify link parameters to a Spotify user profile.

### 8. Spotify Analytics And Navigation Endpoints

Observed analytics/navigation classes including:

```text
Gabo
DeeplinkOpenNonAuth
navigation events
URL dispenser style flows
```

Result:

- `sp_cid` and `dlsi` were treated as campaign/session/deep-link/navigation values.
- No analytics response exposed the account that generated or shared the link.

### 9. Exact Token Public Web Search

Searched exact Spotify tokens:

```text
e98015d9626d4ffc
910364c95fdc4362
e46f8be4b30041c8
5b2987d8f6445a4e836ee3cb02abd98c
058d65493af24ff7
```

Also searched combinations around:

```text
5EainjSN9gBbm2L7YzlUsR dlsi
```

Result:

- No indexed public posting account found.
- External correlation failed for these examples.

### 10. Public Research And Code Search

Checked public OSINT and URL-tracking related sources, including:

- Spotify Web API docs.
- Branch deep-link docs.
- Public discussions/tools around Spotify API, Pathfinder, and link behavior.
- Public URL-cleaning rules.

Result:

- Found no public resolver for `si`, `sp_cid`, or `dlsi` to sharer identity.
- Public API/tooling focuses on content metadata, user-owned playlists, app links, or analytics behavior, not share-origin user disclosure.

### Spotify Conclusion

No strict OSAINT module was added for Spotify.

Reason:

- All observed public/browser endpoints returned content metadata, playlist owner data, generated share metadata, or analytics/navigation data.
- None returned the actual account that shared the URL.
- Adding Spotify would likely misidentify the content owner as the sharer, especially on playlist links.

Current OSAINT behavior for all supplied Spotify URLs:

```json
{
  "error": "Unsupported URL. Use --list to see supported platforms."
}
```

## ClearURLs Review

User requested review of:

```text
https://raw.githubusercontent.com/ClearURLs/Rules/master/data.min.json
```

Checked ClearURLs rule categories for parameters that might expose sharer identity rather than generic tracking.

Findings:

- Most ClearURLs parameters are tracking, campaign, referral, click ID, analytics, or cache-busting fields.
- Many are explicitly meant to be removed because they are not useful to the destination page.
- For OSAINT, a parameter is only useful if it can be decoded or resolved into the actual sharer profile.

YouTube/Spotify related ClearURLs-style parameters:

- YouTube `si` is treated as tracking/share ID, but no public identity resolver was found.
- Spotify `si`, `sp_cid`, `dlsi`, `utm_*`, `nd`, `go` behaved as tracking/deep-link/navigation context, not public sharer identity.

Strict candidates found from wider rule/source review:

- NetEase Cloud Music, `userid` in share URLs.
- Legacy Zhihu, base64 `utm_member` profile slug.

Rejected or not added:

- YouTube, no public `si` to sharer resolver.
- Spotify, no public `si`, `sp_cid`, or `dlsi` to sharer resolver.
- Platforms where parameters identified content owner, seller, campaign, device, referrer, or session, but not actual sharer.

## Other Platform Research And Module Outcomes

These are included for context, since they came from the broader "entire GitHub/ClearURLs list" research.

### Added In Earlier Commits

Xiaohongshu:

- Added support for app share identity parameters such as `appuid` and `shareRedId`.
- These can reveal the sharer user ID/share identity token.

Bilibili:

- Added support for app share `mid` and `share_mid`.
- Strictly rejects profile URLs and lookalike hosts.

Baidu Pan:

- Added support for old Netdisk share links with `uk`.
- Strictly distinguishes share links from share-home/profile links.

### Added In Latest Research Commit

NetEase Cloud Music:

- Added module: `src/modules/netease.js`.
- Uses `userid` in share URLs as the sharer account ID.
- Resolves public profile details from:

```text
https://music.163.com/api/v1/user/detail/<userid>
```

- Keeps `creatorId` separate as `content_creator_id`, because it can refer to the content creator, not the sharer.

Tested example:

```text
https://music.163.com/song/27971936/?userid=132726004
```

Observed output:

```json
{
  "user_id": "132726004",
  "profile_url": "https://music.163.com/#/user/home?id=132726004",
  "name": "...",
  "avatar_url": "...",
  "follower_count": 21,
  "following_count": 71,
  "listened_songs": 17676
}
```

Zhihu:

- Added module: `src/modules/zhihu.js`.
- Decodes legacy `utm_member` base64 value into a strict 32-character hex profile slug.
- Rejects invalid values.

Tested example:

```text
https://www.zhihu.com/question/123?utm_member=YzA1N2VkNTNiYTMyMmMwZDdiODYxYmI0NDRiOWZlYTY%3D
```

Observed output:

```json
{
  "user_id": "c057ed53ba322c0d7b861bb444b9fea6",
  "profile_url": "https://www.zhihu.com/people/c057ed53ba322c0d7b861bb444b9fea6",
  "share_method": "legacy utm_member"
}
```

Commit:

```text
e9a6f86 Add NetEase and Zhihu share metadata support
```

### Rejected Or Not Strict Enough

Rejected because they did not meet the "actual sharer" rule:

- Taobao/Tmall style parameters, mostly seller/item/campaign/session tracking.
- Snapchat style links, no public sharer profile in tested/researched public flows.
- Weibo style parameters, no reliable sharer extraction found from URL params alone.
- QQ Music style links, no strict sharer mapping found.
- Kuaishou style links, no strict sharer mapping found.
- Douban style links, no strict sharer mapping found.
- Douyin share codes were considered promising but not added because a strict, simple, reproducible sharer resolver was not confirmed.

## Old APK / Mobile Reverse Engineering Status

Important honesty note:

- I did not install or execute old APK binaries locally.
- I did inspect public discussions, endpoint behavior, browser traces, public/internal web APIs, and known tooling.
- Old APK static/dynamic analysis remains a possible future line if someone identifies a specific version and legal/safe traffic-capture plan.

Reason not added yet:

- OSAINT should stay simple and use reproducible public endpoints where possible.
- Running old mobile binaries or intercepting app traffic has more safety, legal, auth, and reproducibility constraints.

If GPT 5.5 Pro suggests APK work, the useful output would be:

- Exact APK version.
- Exact endpoint names.
- Whether login is required.
- Whether the endpoint accepts a user-supplied `si`, `sp_cid`, or `dlsi`.
- A sample response proving actual sharer identity, not content owner identity.

## Defender Incident During Research

Windows Defender alert:

```text
Detected: Behavior:Win32/PShellCobStager.A
Affected: powershell.exe
Status: Removed
```

What triggered it:

- A PowerShell base64/gzip decode pattern used while probing Spotify/Branch `_branch_referrer` payloads.
- Defender likely flagged the PowerShell behavior pattern, not the decoded data.

Decoded payloads were only:

```text
https://spotify.link/H6FTskvicDb
https://spotify.link/r9O77qx5vXb?~referring_browser=Chrome
```

Mitigation:

- Stopped using PowerShell for that decode pattern.
- Switched decoding work to Node.
- Checked that Defender had removed the flagged process.

## Validation Commands Run

Project validation:

```powershell
cd C:\Users\saint\Desktop\Programs\OSAINT
npm test
node scripts\research-share-leaks.js --self-test
git diff --check
```

Automated research harness runs:

```powershell
cd C:\Users\saint\Desktop\Programs\OSAINT
node scripts\research-share-leaks.js --platform youtube --url "https://youtu.be/9_pGtoazuSc?si=23gLArT_zXKhlYBh" --out research-runs\youtube-9_pGtoazuSc-23gLArT_zXKhlYBh --quiet
node scripts\research-share-leaks.js --platform youtube --url "https://youtu.be/E27-IDwnhnY?si=p7FQfkwP0NTwOihw" --out research-runs\youtube-E27-IDwnhnY-p7FQfkwP0NTwOihw --quiet
node scripts\research-share-leaks.js --platform spotify --url "https://open.spotify.com/track/2prqm9sPLj10B4Wg0wE5x9?si=e98015d9626d4ffc" --out research-runs\spotify-track-2prqm9s-e98015d9626d4ffc --quiet
node scripts\research-share-leaks.js --platform spotify --url "https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH?si=910364c95fdc4362" --out research-runs\spotify-artist-6qqNVTkY-910364c95fdc4362 --quiet
node scripts\research-share-leaks.js --platform spotify --url "https://open.spotify.com/track/6sKr3450XtdB6xS4y1XbkM?si=e46f8be4b30041c8" --out research-runs\spotify-track-6sKr3450-e46f8be4b30041c8 --quiet
node scripts\research-share-leaks.js --platform spotify --url "https://open.spotify.com/playlist/5EainjSN9gBbm2L7YzlUsR?go=1&sp_cid=5b2987d8f6445a4e836ee3cb02abd98c&utm_source=embed_player_p&utm_medium=desktop&nd=1&dlsi=058d65493af24ff7" --out research-runs\spotify-playlist-5EainjSN-spcid-dlsi --quiet
```

Exact YouTube/Spotify unsupported validation:

```powershell
cd C:\Users\saint\Desktop\Programs\OSAINT
node osaint.js "https://youtu.be/9_pGtoazuSc?si=23gLArT_zXKhlYBh" -q --json
node osaint.js "https://youtu.be/E27-IDwnhnY?si=p7FQfkwP0NTwOihw" -q --json
node osaint.js "https://open.spotify.com/track/2prqm9sPLj10B4Wg0wE5x9?si=e98015d9626d4ffc" -q --json
node osaint.js "https://open.spotify.com/artist/6qqNVTkY8uBg9cP3Jd7DAH?si=910364c95fdc4362" -q --json
node osaint.js "https://open.spotify.com/track/6sKr3450XtdB6xS4y1XbkM?si=e46f8be4b30041c8" -q --json
node osaint.js "https://open.spotify.com/playlist/5EainjSN9gBbm2L7YzlUsR?go=1&sp_cid=5b2987d8f6445a4e836ee3cb02abd98c&utm_source=embed_player_p&utm_medium=desktop&nd=1&dlsi=058d65493af24ff7" -q --json
```

All returned:

```json
{
  "error": "Unsupported URL. Use --list to see supported platforms."
}
```

NetEase validation:

```powershell
cd C:\Users\saint\Desktop\Programs\OSAINT
node osaint.js "https://music.163.com/song/27971936/?userid=132726004" -q --json
```

Zhihu validation:

```powershell
cd C:\Users\saint\Desktop\Programs\OSAINT
node osaint.js "https://www.zhihu.com/question/123?utm_member=YzA1N2VkNTNiYTMyMmMwZDdiODYxYmI0NDRiOWZlYTY%3D" -q --json
```

## Public Sources Checked

ClearURLs:

```text
https://github.com/ClearURLs/Rules
https://raw.githubusercontent.com/ClearURLs/Rules/master/data.min.json
https://docs.clearurls.xyz/1.23.0/specs/rules/
```

YouTube:

```text
https://bugzilla.mozilla.org/show_bug.cgi?id=1876908
https://developers.google.com/youtube/v3/docs/videos/list
```

Spotify:

```text
https://developer.spotify.com/documentation/web-api/reference/get-playlist
https://developer.spotify.com/documentation/web-api/concepts/spotify-uris-ids
https://help.branch.io/apidocs/createdeeplinkurl
```

NetEase:

```text
https://music.163.com/api/v1/user/detail/<userid>
```

Zhihu:

```text
Legacy utm_member base64 profile slug behavior, verified by decoding and strict profile ID shape.
```

## What Would Count As A Real YouTube Or Spotify Breakthrough

A useful new lead should provide at least one of:

- A public endpoint that accepts the exact user-supplied YouTube `si` token and returns the sharer's profile/account.
- A public endpoint that accepts exact Spotify `si`, `sp_cid`, or `dlsi` and returns the sharer's profile/account.
- A browser network response from the exact supplied URL that contains a sharer identity field.
- A documented or reproducible mobile endpoint where the share token is resolved to the actual sharing account.
- A safe APK/static analysis result with a concrete endpoint and sample response proving sharer identity.
- A public web correlation method that finds where the exact token was posted and links it to a public account.

It is not enough if the method returns:

- YouTube video uploader.
- YouTube channel owner.
- Spotify artist.
- Spotify track artist.
- Spotify playlist owner.
- Spotify playlist collaborator.
- Spotify `added_by` user.
- Generated share link for the current browser.
- Campaign, analytics, click, device, branch, or session identifiers without a user profile.

## Current Best Assessment

YouTube:

- The `si` value likely identifies or tracks a share event internally.
- I found no public resolver from `si` to Google/YouTube account.
- The mapping, if it exists, appears server-side.

Spotify:

- `si`, `sp_cid`, and `dlsi` appear to be share/deep-link/analytics/session identifiers.
- I found no public resolver from those values to Spotify account.
- Public endpoints expose content and owner data, not the person who copied/shared the link.

OSAINT status:

- YouTube and Spotify remain unsupported by design.
- This is intentional until a strict sharer identity path is proven.
