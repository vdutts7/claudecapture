<p align="center">
  <img src="https://raw.githubusercontent.com/vdutts7/squircle/main/webp/claude.webp" alt="claude" width="80" height="80" />
</p>
<h1 align="center">claudecapture</h1>
<p align="center">Export your Claude chat data from <a href="https://claude.ai">claude.ai</a></p>

---

## Which tool

| | scope | run from | output |
|---|---|---|---|
| `claudecanonical.sh` | one chat | terminal | copies canonical API URL to clipboard |
| `claudeexportall.js` | whole account | DevTools console | JSON with all chats, projects, memory, styles |
| `claudecapture.js` | one chat | DevTools console | JSON + diagram HTMLs from live DOM |
| `diagrams.js` | post-process | terminal or DevTools | standalone HTML from canonical JSON diagrams |

`claudecanonical` and `claudeexportall` hit the server-side API with `render_all_tools=true` - full tool results, thinking blocks, ms timestamps, message tree. `claudecapture` scrapes the rendered page via React fiber - different data source, same diagram output.

All canonical API URLs use:
```
/api/organizations/{ORG}/chat_conversations/{ID}?tree=True&rendering_mode=messages&render_all_tools=true&consistency=eventual
```

## Setup

```bash
cp .env.example .env   # add CLAUDE_ORG_UUID (claudecanonical.sh only)
chmod +x claudecanonical.sh
```

Org UUID (DevTools console on claude.ai):
```js
fetch("/api/organizations").then(r=>r.json()).then(d=>console.log(d.filter(o=>JSON.stringify(o.capabilities).includes("chat"))[0].uuid))
```

## Usage

**`claudecanonical.sh`** - copies canonical URL to clipboard. Paste in address bar.
```bash
./claudecanonical.sh <chat-id-or-url>
./claudecanonical.sh                    # reads clipboard via pbpaste
```

**`claudeexportall.js`** - paste in DevTools console on claude.ai. Large accounts (500+ chats) take 5-10 min.

**`claudecapture.js`** - paste in DevTools console on a chat page. Downloads conversation JSON + diagram HTMLs.

**`diagrams.js`** - extracts diagrams from canonical JSON as standalone HTML with baked-in CSS.
```bash
node diagrams.js path/to/canonical.json          # writes .html files next to the JSON
```
Browser: paste in DevTools, pick the canonical JSON from file dialog.

## Gotchas

- **Two orgs per account.** `/api/organizations` returns an API org and a chat org. Chat data lives in the one with `"chat"` in capabilities, not `orgs[0]`. Scripts handle this automatically.
- **`render_all_tools=true`** is critical. Without it, responses are text-only - no tool blocks, no diagram source.
- **`prompt_template`** is the field name for project instructions. Not `prompt`, not `instructions`.
- **Session cookies expire.** Refresh claude.ai if you get 401s.

## Contact

<a href="https://vd7.io"><img src="https://res.cloudinary.com/ddyc1es5v/image/upload/v1773910810/readme-badges/readme-badge-vd7.png" alt="vd7.io" height="40" /></a> &nbsp; <a href="https://x.com/vdutts7"><img src="https://res.cloudinary.com/ddyc1es5v/image/upload/v1773910817/readme-badges/readme-badge-x.png" alt="/vdutts7" height="40" /></a>