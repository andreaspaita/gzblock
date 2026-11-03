# GZBlock

A discreet ad blocker for Chrome, Edge, Brave and Firefox. Available in English and French.
(Version française : `LISEZMOI.md`.)

## Install

**Chrome, Edge, Brave**
1. Unzip the `gzblock` folder.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `gzblock` folder.

**Firefox (128 or later)**
1. In the folder, rename `manifest.json` to `manifest-chrome.json`, then
   `manifest-firefox.json` to `manifest.json`.
2. Open `about:debugging#/runtime/this-firefox` > **Load Temporary Add-on** > pick `manifest.json`.
3. In `about:addons` > GZBlock > **Permissions**, allow access to all websites.

## Language

GZBlock follows your browser language (French if your browser is in French, English otherwise).
To force a language: **Options** > **Language** > Automatic / Français / English.

## Features

| Feature | Where |
|---|---|
| **EasyList** + **Liste FR** filter lists (same as AdBlock / Adblock Plus), updated every 24 h | automatic · status in **Options** |
| **Hide an element**: hover, click, "Hide" ("Wider" selects the parent block, Esc cancels) | icon menu |
| Your hidden elements, with delete | **Options** |
| Disable / re-enable per site | icon menu · **Options** |
| Hidden-ads counter | icon badge |
| **Discreet** mode (default) or **Strict** mode (network blocking, like AdBlock) | **Options** |
| Video ads skipped without breaking the player | automatic |
| Advertising cookies, tracking, clean links | icon menu |

### Why Discreet mode by default

"Please disable your ad blocker" messages appear when a site's ad fails to load
(blocked request, hidden video SDK). In Discreet mode nothing is blocked: ads load
but are hidden, and video ads play **muted, invisible and fast-forwarded to the end**,
so the player counts them as watched and starts the real video. Only site-specific list
filters are applied (they target real ads, not the "bait" elements used to detect blockers).

Strict mode also blocks ad requests and applies all generic filters: lighter pages,
but some sites will detect the blocker.

## Privacy (icon menu, applies to all sites)

| Option (on by default) | Effect |
|---|---|
| Advertising cookies | Requests to ~70 ad networks and trackers are sent **without cookies**; existing tracking cookies are deleted (`_ga`, `__gads`, `_fbp`, `IDE`, Criteo…). Also turns off Chrome's built-in ad profiling (Topics, Protected Audience, ad measurement) and `<a ping>` click tracking. |
| Block third-party cookies | Browser setting. May break an embedded "Sign in with…" button: untick if needed. |
| "Do not track me" signal (GPC) | Sends `Sec-GPC: 1`, a legal opt-out from the sale/sharing of your data in some regions. |
| Clean links | Removes `utm_*`, `gclid`, `fbclid`, `msclkid`… from visited addresses. |

Kept on purpose: session, cart and sign-in cookies (Facebook, LinkedIn, Google…).
Unticking an option hands the matching setting back to the browser.

## Limits

No ad blocker is 100% undetectable. Ads inside YouTube / Twitch videos are not covered.
If a site still detects the blocker, check that Discreet mode is selected and that no
other ad blocker (AdBlock, uBlock…) is active, then reload the page.
