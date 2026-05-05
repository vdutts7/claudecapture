<div align="center">

<a href="https://vd7.io"><img src="https://res.cloudinary.com/ddyc1es5v/image/upload/w_160,h_160,c_fill/v1772395999/vd7-pfp-gradient.webp" alt="vd7" width="80" height="80" /></a>

<h1>claudecapture</h1>

<p><i><b>Three tools to pull your data out of claude.ai, ordered by how complete the export is</b></i></p>

<img src="assets/badges/javascript.badge.svg" alt="vanilla JS" height="34" />
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

- **claude.ai** keeps rich chat data (tool payloads, thinking, precise timestamps) behind the normal UI and partial exports
- you often need **one chat in full**, **the whole account**, or **rendered diagrams** as standalone files, not three different half-measures

**Solution**

- **`claudecanonical.sh`** copies the canonical JSON URL for a single conversation (same shape the app uses: tools, thinking, ms timestamps, tree)
- **`claudeexportall.js`** pastes into DevTools once and downloads one JSON with conversations, projects (instructions + docs links), memory, and styles
- **`claudecapture.js`** scrapes the rendered DOM and lifts diagram/widget source from React fiber into standalone HTML (SVG colors baked in, no iframe sandbox fight)

**Summary**

- rank tools by **scope** (one chat vs whole account) and **fidelity** (raw API vs rendered page)
- **`claudecanonical`** and **`claudeexportall`** hit the internal API with **`render_all_tools=true`** so tool blocks are not stripped
- **`claudecapture`** is for when you care about **what hit the screen** (especially diagrams), not raw API payloads

___

## Install

```bash
cp .env.example .env          # add CLAUDE_ORG_UUID (needed only for claudecanonical.sh)
chmod +x claudecanonical.sh
```

Org UUID on **claude.ai** (DevTools console):

```js
fetch("/api/organizations").then(r=>r.json()).then(d=>console.log(d.filter(o=>JSON.stringify(o.capabilities).includes("chat"))[0].uuid))
```

___

## Usage

### `claudecanonical.sh`

**Signature:** `./claudecanonical.sh [<chat-id-or-url>]`

| Argument | Role |
| --- | --- |
| `<chat-id-or-url>` | UUID or full `https://claude.ai/chat/…` URL |
| *(omit)* | Reads **`pbpaste`** and pulls the first UUID it finds |

**Examples**

```bash
./claudecanonical.sh xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
./claudecanonical.sh https://claude.ai/chat/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# copy a chat URL, then:
./claudecanonical.sh
```

Paste the copied URL in the address bar, select all, save. You get the same JSON the product uses to render the thread.

### `claudeexportall.js`

**Signature:** *(browser console on **claude.ai**)* paste full file, Enter

| Step | Action |
| --- | --- |
| Open | **claude.ai** logged in |
| Run | DevTools console → paste **`claudeexportall.js`** → Enter |

**Examples**

```
DevTools (Cmd+Opt+J) → paste contents of claudeexportall.js → Enter
```

Writes **`claude-full-export-YYYY-MM-DD.json`**. Large accounts (500+ chats) often need **5-10 minutes**.

### `claudecapture.js`

**Signature:** *(browser console on an open chat)* paste full file, Enter

| Step | Action |
| --- | --- |
| Open | **`claude.ai/chat/…`** |
| Run | DevTools console → paste **`claudecapture.js`** → Enter |

**Examples**

```
DevTools (Cmd+Opt+J) → paste contents of claudecapture.js → Enter
```

Downloads conversation JSON plus standalone diagram HTML files built from the live DOM + fiber.

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

Canonical API shape (both URL builders use these query flags):

```
/api/organizations/{ORG}/chat_conversations/{ID}?tree=True&rendering_mode=messages&render_all_tools=true&consistency=eventual
```

Without **`render_all_tools=true`** responses tend to be text-only. **`claudecapture`** reads the painted DOM instead (different tradeoffs, same product session).

___

## Requirements

- **macOS** with **`pbcopy`** / **`pbpaste`** for **`claudecanonical.sh`** (clipboard URL parsing)
- **`zsh`** for **`claudecanonical.sh`**
- modern Chromium browser, logged into **claude.ai**, for **`claudeexportall.js`** and **`claudecapture.js`**
- **`CLAUDE_ORG_UUID`** in **`.env`** when using **`claudecanonical.sh`**

___

## Contact

<a href="https://vd7.io"><img src="https://res.cloudinary.com/ddyc1es5v/image/upload/v1773910810/readme-badges/readme-badge-vd7.png" alt="vd7.io" height="40" /></a> &nbsp; <a href="https://x.com/vdutts7"><img src="https://res.cloudinary.com/ddyc1es5v/image/upload/v1773910817/readme-badges/readme-badge-x.png" alt="/vdutts7" height="40" /></a>
