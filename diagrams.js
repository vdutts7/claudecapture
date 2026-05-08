// diagrams.js - extract diagrams from canonical JSON as standalone HTML
// node: node diagrams.js path/to/canonical.json
// browser: paste in DevTools console, pick JSON from file dialog

const DCSS = [
  'text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
  'text.t  { font-size: 13px; fill: #374151; }',
  'text.th { font-size: 14px; font-weight: 600; fill: #111827; }',
  'text.ts { font-size: 11px; fill: #6b7280; }',
  'line.arr, path.arr { stroke: #9ca3af; stroke-width: 1.2; fill: none; }',
  'g.c-blue rect    { fill: #dbeafe; stroke: #93c5fd; }',
  'g.c-blue text.th { fill: #1e40af; } g.c-blue text.ts { fill: #2563eb; }',
  'g.c-purple rect    { fill: #ede9fe; stroke: #c4b5fd; }',
  'g.c-purple text.th { fill: #5b21b6; } g.c-purple text.ts { fill: #7c3aed; }',
  'g.c-teal rect    { fill: #ccfbf1; stroke: #5eead4; }',
  'g.c-teal text.th { fill: #134e4a; } g.c-teal text.ts { fill: #0f766e; }',
  'g.c-amber rect    { fill: #fef3c7; stroke: #fcd34d; }',
  'g.c-amber text.th { fill: #92400e; } g.c-amber text.ts { fill: #b45309; }',
  'g.c-green rect    { fill: #dcfce7; stroke: #86efac; }',
  'g.c-green text.th { fill: #14532d; } g.c-green text.ts { fill: #15803d; }',
  'g.c-red rect    { fill: #fee2e2; stroke: #fca5a5; stroke-dasharray: 4 2; }',
  'g.c-red text.th { fill: #991b1b; } g.c-red text.ts { fill: #dc2626; }',
  'g.c-gray rect    { fill: #f3f4f6; stroke: #d1d5db; }',
  'g.c-gray text.th { fill: #1f2937; } g.c-gray text.ts { fill: #6b7280; }',
].join('\n  ');

function wrapSvg(title, code) {
  const fixed = code
    .replace(/stroke="context-stroke"/g, 'stroke="#6b7280"')
    .replace(/^(<svg[^>]*>)/, `$1\n<style>\n  ${DCSS}\n</style>`);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>body{margin:0;padding:32px;background:#f9f8f5;font-family:-apple-system,sans-serif}
.wrap{max-width:720px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;
box-shadow:0 2px 16px rgba(0,0,0,.08)}svg{width:100%;height:auto;display:block}</style>
</head><body><h2 style="text-align:center;color:#374151;margin:0 0 20px;font-size:15px;
font-weight:600">${title.replace(/_/g, " ")}</h2>
<div class="wrap">${fixed}</div></body></html>`;
}

function extract(data) {
  const out = [];
  for (const m of (data.chat_messages || [])) {
    for (const b of (m.content || [])) {
      if (b.type !== "tool_use" || !b.input?.widget_code) continue;
      if (!b.name?.includes("show_widget") && !b.name?.includes("update_widget")) continue;
      const code = b.input.widget_code;
      const title = b.input.title || `diagram-${out.length}`;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
      out.push({ slug, html: code.trim().startsWith("<svg") ? wrapSvg(title, code) : code });
    }
  }
  return out;
}

// ---- Node ----
if (typeof process !== "undefined" && process.argv?.[2]) {
  const fs = require("fs"), path = require("path");
  const file = process.argv[2];
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const diagrams = extract(data);
  if (!diagrams.length) { console.log("no diagrams found."); process.exit(0); }
  const dir = path.dirname(file);
  for (const d of diagrams) {
    const out = path.join(dir, `${d.slug}.html`);
    fs.writeFileSync(out, d.html);
    console.log(`  -> ${out}`);
  }
}

// ---- Browser ----
if (typeof window !== "undefined") {
  const input = document.createElement("input");
  input.type = "file"; input.accept = ".json";
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      const diagrams = extract(JSON.parse(ev.target.result));
      let delay = 0;
      for (const d of diagrams) {
        setTimeout(() => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([d.html], { type: "text/html" }));
          a.download = `${d.slug}.html`; document.body.appendChild(a); a.click(); a.remove();
          console.log(`downloaded: ${d.slug}.html`);
        }, delay);
        delay += 600;
      }
      if (!diagrams.length) console.log("no diagrams found.");
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}
