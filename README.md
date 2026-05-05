<p align="center">
  <img src="https://raw.githubusercontent.com/vdutts7/squircle/main/webp/claude.webp" alt="claude icon" width="80" height="80" />
  <img src="https://raw.githubusercontent.com/vdutts7/squircle/main/webp/material-icons/json.webp"  alt="json icon" width="80" height="80" />
</p>

<div align="center">

<h1>claudecapture</h1>

<p><b>Fully export your Claude chat data out of Claude.ai Web (https://claude.ai)</b></p>

<img src="assets/badges/zsh.badge.svg" alt="zsh" height="34" />
<img src="assets/badges/anthropic.badge.svg" alt="claude.ai" height="34" />

</div>

<br/>

___

## Contents

- [About](#about)
- [Install](#install)
- [Usage](#usage)
- [Requirements](#requirements)
- [Contact](#contact)

___

## About

**Problem**

- **claude.ai** keeps rich chat data (tool payloads, thinking blocks, precise timestamps) behind the normal UI and partial exports
- you often need **one chat in full**, **the whole account**, or **rendered diagrams** as standalone files, not three different half-measures

**Solution**

- **`claudecanonical.sh`**
  - copies the canonical JSON URL for ONE chat
  - same payload shape the product uses: tools, thinking blocks, ms timestamps, tree
- **`claudeexportall.js`**
  - one DevTools paste, one JSON download
  - conversations, projects (instructions + docs links), memory, styles
- **`claudecapture.js`**
  - DOM scrape plus diagram/widget source from React fiber
  - standalone HTML (**SVG** colors baked in)
  - no iframe sandbox limits

**Summary**

- rank tools by **scope** (one chat vs whole account) and **fidelity** (raw API vs rendered page)
- **`claudecanonical`** and **`claudeexportall`** hit the internal API with **`render_all_tools=true`** so tool blocks are not stripped
- **`claudecapture`** is for when you care about **what hit the screen** (especially diagrams), not raw API payloads

___

## Install

```bash
cp ".env.example" ".env"
# add CLAUDE_ORG_UUID (needed only for claudecanonical.sh)
chmod +x claudecanonical.sh
```

Organization UUID on **https://claude.ai** (DevTools > Console):

```js
fetch("/api/organizations").then(r=>r.json()).then(d=>console.log(d.filter(o=>JSON.stringify(o.capabilities).includes("chat"))[0].uuid))
```

> or get it from UI → https://claude.ai/settings/account

___

## Usage

### `claudecanonical.sh`

**Signature:** `./claudecanonical.sh [<chat-id_or_chat-url>]`

| Argument | Role |
| --- | --- |
| `<chat-id-or-url>` | UUID or full `https://claude.ai/chat/…` URL |
| *(omit)* | Reads **`pbpaste`** and pulls the first UUID it finds |

Ex:
```bash
./claudecanonical.sh xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
./claudecanonical.sh https://claude.ai/chat/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# copy a chat URL, then:
./claudecanonical.sh
```

- paste copied URL in address bar → full JSON
- same JSON Claude.ai uses to render the thread

<table>
<tr>
<td width="50%" valign="top"><img src="https://res.cloudinary.com/ddyc1es5v/image/upload/v1778020201/gh-repos/claudecapture/readme-claudecanonical-1.png" alt="claudecanonical demo 1" width="100%" /></td>
<td width="50%" valign="top"><img src="https://res.cloudinary.com/ddyc1es5v/image/upload/v1778020202/gh-repos/claudecapture/readme-claudecanonical-2.jpg" alt="claudecanonical demo 2" width="100%" /></td>
</tr>
</table>

### `claudeexportall.js`

| Step | Action |
| --- | --- |
| Open | **https://claude.ai** (logged in) |
| Run | DevTools > Console → paste **`claudeexportall.js`** → Enter |


- downloads **`claude-full-export-YYYY-MM-DD.json`** 
- large accounts (500+ chats) often need **5-10 minutes** (let it run, don't interrupt)

<img src="https://res.cloudinary.com/ddyc1es5v/image/upload/v1778023257/gh-repos/claudecapture/readme-claudeexportall.png" alt="claudeexportall console" width="100%" />

### `claudecapture.js`

**Signature:** *(browser console on an open chat)* paste full file, Enter

| Step | Action |
| --- | --- |
| Open | **`https://claude.ai/chat/xxxxxx`** |
| Run | DevTools > Console → paste **`claudecapture.js`** → Enter |

- downloads conversation JSON plus standalone diagram HTML from live DOM + fiber

<img src="https://res.cloudinary.com/ddyc1es5v/image/upload/v1778020200/gh-repos/claudecapture/social-preview.png" alt="claudecapture" width="100%" />

### Comparison

| | **claudecanonical** | **claudeexportall** | **claudecapture** |
| --- | --- | --- | --- |
| scope | one chat | whole account | one chat |
| tool results | full raw JSON | full raw JSON | absent |
| thinking blocks | full | full | absent |
| timestamps | ms | ms | coarse |
| projects / docs / memory | no | yes | no |
| diagrams as HTML | no | no | yes |
| offline | no | no | yes after cached DOM |

Canonical API shape (both url builders use these query flags):

```text
/api/organizations/{ORG_UUID}/chat_conversations/{CHAT_ID}?tree=True&rendering_mode=messages&render_all_tools=true&consistency=eventual
```

- without **`render_all_tools=true`**, responses skew text-only
- **`claudecapture`** reads painted DOM instead (**different tradeoffs**, same **https://claude.ai** session)

___

### Fallback chain

If Anthropic locks down the internal API, the tools degrade gracefully:

| route | tool | breakage vector | survivability |
| --- | --- | --- | --- |
| canonical API w/ params | `claudecanonical`, `claudeexportall` | CSRF, rate limits, endpoint removal | medium |
| canonical API bare (no params) | downgrade `claudeexportall` | same but simpler, more likely to survive | medium-high |
| official data export | Settings > Privacy > Export data | **none - GDPR / CCPA mandated** | **permanent** |
| HAR capture | DevTools > Network > Save all as HAR | **none - browser feature** | **permanent** |
| DOM scrape | `claudecapture` | Anthropic changes DOM structure | low-medium |

2 routes are **unbreakable**:
- official export (legally required)
- HAR capture (via DevTools > Network)

> Everything else is best-effort against internal API changes

___

### Gotchas

- **two orgs per account** - `/api/organizations` returns an API org and a chat org. chat data lives in the one with `"chat"` in capabilities, **not** `orgs[0]`
- **`render_all_tools=true`** - without this param, conversation responses are text-only. no tool results, no structured content blocks
- **`prompt_template`** - project instructions field is called `prompt_template`, not `prompt`, not `instructions`, not `system_prompt`
- **`copy()` over blob** - Chrome's `copy()` console function bypasses popup blockers. blob download can silently fail
- **relative URLs** - use `/api/...` in console, not `https://claude.ai/api/...`, to avoid CORS

___

## Requirements

- **macOS** with **`pbcopy`** / **`pbpaste`** for **`claudecanonical.sh`** (clipboard URL parsing)
- **`zsh`** for **`claudecanonical.sh`**
- modern Chromium browser, logged into **https://claude.ai**, for **`claudeexportall.js`** and **`claudecapture.js`**
- **`CLAUDE_ORG_UUID`** in **`.env`** when using **`claudecanonical.sh`**

___

## Contact

<a href="https://vd7.io"><img src="https://res.cloudinary.com/ddyc1es5v/image/upload/v1773910810/readme-badges/readme-badge-vd7.png" alt="vd7.io" height="40" /></a> &nbsp; <a href="https://x.com/vdutts7"><img src="https://res.cloudinary.com/ddyc1es5v/image/upload/v1773910817/readme-badges/readme-badge-x.png" alt="/vdutts7" height="40" /></a>
