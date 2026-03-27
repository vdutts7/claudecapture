[![vd7](https://res.cloudinary.com/ddyc1es5v/image/upload/v1772395999/vd7-pfp-gradient.webp)](https://vd7.io)

# claudecapture

***Capture Claude conversations + diagrams from any claude.ai page. Single browserscript***

Paste into console → get a ZIP with conversation JSON/MD and standalone colored diagram HTML files. Reads widget source directly from the React fiber — bypasses the iframe sandbox that normally makes diagrams go black when saved.

---

## Install

**Bookmarklet (easiest) —** drag this to your bookmarks bar:

```
javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/vdutts7/claudecapture@main/claudecapture.js';document.head.appendChild(s);})()
```

**Console —** open DevTools on any `claude.ai` page and paste `claudecapture.js` directly.

---

## Usage

```js
// after loading the script:
window.__claudeCapture()        // capture + download ZIP
```

That's it. Two files download automatically:

- `title_timestamp.json` — full structured capture: messages, markdown, web search, tool steps, raw widget source
- `diagram-title_timestamp.html` — standalone colored diagram, open in any browser

---

## Why it works

Claude diagrams render inside a sandboxed `a.claude.ai/isolated-segment` iframe. The SVG source is injected from the host's CSS — so saving the SVG gives you black boxes.

This script reads the widget source directly from the React fiber (`__reactFiber` → `memoizedProps` → `updatedMessage.content`) before it ever hits the iframe, then applies two fixes to make it render standalone:

1. Injects the color CSS as a `<style>` block inside the SVG
2. Replaces `stroke="context-stroke"` (SVG paint server, iframe-only) with `stroke="#6b7280"`

---

## Output

```
title_2026-03-27T17-44-06.json          full conversation + raw widget source
diagram-name_2026-03-27T17-44-06.html  standalone diagram, colors baked in
```

---

## Stack

![JavaScript](https://cdn.simpleicons.org/javascript/F7DF1E) vanilla JS - zero deps  
![Claude](https://cdn.simpleicons.org/anthropic/000000) claude.ai React fiber  
![SVG](https://cdn.simpleicons.org/svg/FFB13B) SVG + inline CSS injection  

---

## Contact

[![website](https://img.shields.io/badge/vd7.io-000000?style=for-the-badge&logo=data:image/webp;base64,&logoColor=white)](https://vd7.io)
[![Twitter](https://img.shields.io/badge/vdutts7-000000?style=for-the-badge&logo=X&logoColor=white)](https://x.com/vdutts7)
