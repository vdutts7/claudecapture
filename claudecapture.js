(function claudeCaptureConversation() {
  'use strict';

  // ---- DOM -> Markdown ----
  function nodeToMarkdown(node) {
    if (!node) return '';
    if (node.nodeType === 3) return node.textContent || '';
    if (node.nodeType === 1) {
      var tag = node.tagName.toLowerCase();
      var ch = Array.from(node.childNodes).map(nodeToMarkdown).join('');
      if (tag === 'p') return ch + '\n\n';
      if (tag === 'br') return '\n';
      if (tag === 'h1') return '# ' + ch + '\n\n';
      if (tag === 'h2') return '## ' + ch + '\n\n';
      if (tag === 'h3') return '### ' + ch + '\n\n';
      if (tag === 'h4') return '#### ' + ch + '\n\n';
      if (tag === 'strong' || tag === 'b') return '**' + ch + '**';
      if (tag === 'em' || tag === 'i') return '_' + ch + '_';
      if (tag === 'code') return node.closest('pre') ? ch : ('`' + ch + '`');
      if (tag === 'pre') return '\n```\n' + ch + '\n```\n\n';
      if (tag === 'a') { var href = node.getAttribute('href') || ''; var t = ch.trim(); return (href && t) ? '[' + t + '](' + href + ')' : t; }
      if (tag === 'ul') return ch + '\n';
      if (tag === 'ol') return ch + '\n';
      if (tag === 'li') return '- ' + ch.trim() + '\n';
      if (tag === 'hr') return '\n---\n\n';
      if (tag === 'table') return ch + '\n';
      if (tag === 'tr') return '| ' + ch.trim() + ' |\n';
      if (tag === 'th' || tag === 'td') return ch.trim() + ' | ';
      if (['div','section','article','span','main','header','footer','nav','aside'].indexOf(tag) >= 0) return ch;
      if (['button','svg','img','path','circle','rect','use','defs','symbol','g','script','style','noscript'].indexOf(tag) >= 0) return '';
      return ch;
    }
    return '';
  }

  // ---- React fiber helpers ----
  function getFiber(el) {
    var k = Object.keys(el).find(function(k) { return k.startsWith('__reactFiber'); });
    return k ? el[k] : null;
  }
  function findUrlInFiber(fiber, depth) {
    depth = depth || 0;
    if (!fiber || depth > 15) return null;
    var p = fiber.memoizedProps;
    if (p && p.url && typeof p.url === 'string' && p.url.startsWith('http')) return p.url;
    if (p && p.result && p.result.url) return p.result.url;
    if (p && p.item && p.item.url) return p.item.url;
    return findUrlInFiber(fiber.return, depth + 1);
  }

  // ---- Get raw message data from React fiber ----
  // Bypasses DOM - reads Claude's internal message state directly
  function getMessageData(kidEl) {
    var fiber = getFiber(kidEl);
    if (!fiber) return null;
    var props = fiber.memoizedProps;
    if (!props || !props.children) return null;
    var children = Array.isArray(props.children) ? props.children : [props.children];
    var msgChild = children.find(function(c) { return c && c.props && c.props.updatedMessage; });
    return msgChild ? msgChild.props.updatedMessage : null;
  }

  // ---- Tool content extractor (widgets/diagrams, skill steps) ----
  function extractToolContent(messageData) {
    if (!messageData || !messageData.content) return null;
    var content = messageData.content;
    var result = { steps: [], widgets: [] };
    for (var i = 0; i < content.length; i++) {
      var block = content[i];
      if (block.type !== 'tool_use') continue;
      var name = block.name || '';
      var input = block.input || {};
      if (name === 'view' || name === 'read_me') {
        result.steps.push({ tool: name, description: input.description || '', path: input.path || '', modules: input.modules || [] });
      }
      if (name === 'visualize:read_me') {
        result.steps.push({ tool: name, modules: input.modules || [] });
      }
      if (name === 'visualize:show_widget' || name === 'visualize:update_widget') {
        var code = input.widget_code || '';
        result.widgets.push({
          tool: name,
          title: input.title || '',
          loadingMessages: input.loading_messages || [],
          widgetCode: code,
          widgetType: code.includes('<svg') ? 'svg' : (code.includes('<html') ? 'html' : 'unknown'),
          widgetCodeLength: code.length
        });
      }
    }
    return (result.steps.length || result.widgets.length) ? result : null;
  }

  // ---- Web search panel extractor ----
  function extractWebSearch(claudeRespEl) {
    var searchRow = claudeRespEl.querySelector('[class*="row-start-1"]');
    if (!searchRow) return null;
    var overflow = searchRow.querySelector('[class*="overflow-hidden"]');
    if (!overflow) return null;
    var queryList = overflow.querySelector('[class*="flex-col"]');
    if (!queryList) return null;
    var groups = Array.from(queryList.children).filter(function(g) {
      var t = g.innerText.trim();
      return t && t !== 'Done' && t.length > 5;
    });
    if (!groups.length) return null;
    return groups.map(function(group) {
      var btn = group.querySelector('button[class*="group/row"]');
      var lines = btn ? btn.innerText.split('\n').map(function(l) { return l.trim(); }).filter(Boolean) : [];
      var resultRows = group.querySelectorAll('[class*="flex-row gap-3 items-center"]');
      var results = Array.from(resultRows).map(function(row) {
        var titleEl = row.querySelector('[class*="font-small"], [class*="truncate"]');
        var domainEl = row.querySelector('[class*="text-xs"]');
        var title = titleEl ? titleEl.innerText.trim() : '';
        var domain = domainEl ? domainEl.innerText.trim() : '';
        var url = findUrlInFiber(getFiber(row)) || ('https://' + domain);
        return title ? { title: title, url: url, domain: domain } : null;
      }).filter(Boolean);
      return { query: lines[0] || '', resultCount: lines[1] || '', results: results };
    });
  }

  // ---- Scroller & container finders ----
  function findScroller() {
    var p = document.querySelector('#main-content .overflow-y-auto, #main-content [class*="overflow-y-auto"]');
    if (p) return p;
    return Array.from(document.querySelectorAll('div')).filter(function(el) {
      var s = getComputedStyle(el);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50;
    }).sort(function(a, b) { return b.scrollHeight - a.scrollHeight; })[0] || null;
  }
  function findConvContainer(scroller) {
    var sels = ['.flex-1.flex.flex-col.px-4.max-w-3xl', '#main-content [class*="flex-col"][class*="max-w-3xl"]', '[class*="flex-col"][class*="px-4"][class*="max-w"]'];
    for (var i = 0; i < sels.length; i++) { var el = document.querySelector(sels[i]); if (el) return el; }
    return scroller;
  }

  // ---- Message extractor ----
  function extractMessages(container) {
    var messages = [];
    if (!container) return messages;
    Array.from(container.children).forEach(function(kid) {
      if (kid.querySelector && kid.querySelector('button') && kid.innerText && kid.innerText.includes('Report')) return;
      if (kid.innerText && kid.innerText.includes('Start your own conversation')) return;

      var userEl = kid.querySelector ? kid.querySelector('[data-testid="user-message"]') : null;
      if (userEl) {
        var ts = kid.querySelector('[class*="text-xs"]');
        messages.push({ role: 'user', text: userEl.innerText.trim(), timestamp: ts ? ts.innerText.trim() : undefined });
        return;
      }

      var claudeEl = kid.querySelector ? kid.querySelector('.font-claude-response, [class*="font-claude-response"]') : null;
      if (claudeEl) {
        var stdMd = claudeEl.querySelector('.standard-markdown');
        var markdown = stdMd ? nodeToMarkdown(stdMd).replace(/\n{3,}/g, '\n\n').trim() : claudeEl.innerText.trim();
        var webSearchDOM = extractWebSearch(claudeEl);
        var msgData = getMessageData(kid);
        var toolContent = msgData ? extractToolContent(msgData) : null;
        var msg = { role: 'assistant', markdown: markdown };
        if (webSearchDOM && webSearchDOM.length) msg.webSearch = webSearchDOM;
        if (toolContent) msg.toolContent = toolContent;
        messages.push(msg);
        return;
      }

      if (kid.innerText && kid.innerText.trim().length > 100) {
        var isUser = !!(kid.querySelector && kid.querySelector('[class*="items-end"]'));
        messages.push({ role: isUser ? 'user' : 'assistant', text: kid.innerText.trim(), note: 'fallback' });
      }
    });
    return messages;
  }

  function getTitle() {
    var h = document.querySelector('#main-content header, [data-testid="page-header"]');
    if (h) { var lines = h.innerText.split('\n').map(function(s) { return s.trim(); }).filter(Boolean); return lines[0] || ''; }
    return document.title || '';
  }
  function getSharedBy() {
    var h = document.querySelector('#main-content header');
    if (h) { var m = h.innerText.match(/Shared by (.+)/i); if (m) return m[1].trim(); }
    return undefined;
  }
  function makeSlug(str) {
    return (str || 'claude-conversation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
  }
  function downloadBlob(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var blobUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = blobUrl; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 1000);
    console.log('[ClaudeCapture] Downloaded:', filename);
  }

  function downloadAll(result) {
    var ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    var slug = makeSlug(result.title);

    // 1. Main JSON
    downloadBlob(JSON.stringify(result, null, 2), slug + '_' + ts + '.json', 'application/json');

    // CSS for standalone SVG diagrams.
    // Normally injected by a.claude.ai/isolated-segment iframe - never ships with widget_code.
    // Without this: all rects render black (SVG default fill).
    // context-stroke on arrowheads is also unsupported outside the iframe - falls back to black.
    var DIAGRAM_CSS = [
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

    // 2. Standalone HTML for each widget/diagram
    var delay = 600;
    result.messages.forEach(function(msg) {
      if (!msg.toolContent || !msg.toolContent.widgets) return;
      msg.toolContent.widgets.forEach(function(w) {
        if (!w.widgetCode) return;
        var widgetSlug = makeSlug(w.title || 'diagram');
        var htmlContent;
        if (w.widgetType === 'svg') {
          // Fix 1: context-stroke unsupported standalone - replace with real color
          var code = w.widgetCode.replace(/stroke="context-stroke"/g, 'stroke="#6b7280"');
          // Fix 2: inject color CSS as <style> inside the SVG
          code = code.replace(/^(<svg[^>]*>)/, '$1\n<style>\n  ' + DIAGRAM_CSS + '\n</style>');
          htmlContent = '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n' +
            '  <title>' + (w.title || 'Diagram') + '</title>\n  <style>\n' +
            '    body { margin: 0; padding: 32px; background: #f9f8f5; font-family: -apple-system, sans-serif; }\n' +
            '    h2 { text-align: center; color: #374151; margin: 0 0 20px; font-size: 15px; font-weight: 600; }\n' +
            '    .wrap { max-width: 720px; margin: 0 auto; background: white; border-radius: 12px;\n' +
            '            padding: 28px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }\n' +
            '    svg { width: 100%; height: auto; display: block; }\n' +
            '  </style>\n</head>\n<body>\n' +
            '  <h2>' + (w.title || 'Diagram').replace(/_/g, ' ') + '</h2>\n' +
            '  <div class="wrap">\n    ' + code + '\n  </div>\n</body>\n</html>';
        } else {
          htmlContent = w.widgetCode; // already full HTML
        }
        setTimeout(function() {
          downloadBlob(htmlContent, widgetSlug + '_' + ts + '.html', 'text/html');
        }, delay);
        delay += 600;
      });
    });
  }

  // ---- MAIN CAPTURE (virtualized scroller support) ----
  function capture(opts) {
    opts = opts || {};
    var scroller = findScroller();
    var container = findConvContainer(scroller);
    return new Promise(function(resolve) {
      function doCapture() {
        var messages = extractMessages(container);
        resolve({
          title: getTitle(), sharedBy: getSharedBy(),
          url: window.location.href, capturedAt: new Date().toISOString(),
          messages: messages,
          metadata: {
            messageCount: messages.length,
            userMessages: messages.filter(function(m) { return m.role === 'user'; }).length,
            assistantMessages: messages.filter(function(m) { return m.role === 'assistant'; }).length,
            widgetCount: messages.reduce(function(n, m) { return n + (m.toolContent && m.toolContent.widgets ? m.toolContent.widgets.length : 0); }, 0),
            scrollHeight: scroller ? scroller.scrollHeight : null,
            fullyScrolled: opts.scrolled || false
          }
        });
      }
      if (!scroller || scroller.scrollHeight <= scroller.clientHeight * 1.1 || opts.noScroll) { doCapture(); return; }
      var origTop = scroller.scrollTop, lastH = scroller.scrollHeight, stable = 0, round = 0;
      function step() {
        round++;
        scroller.scrollTop = scroller.scrollHeight;
        setTimeout(function() {
          var h = scroller.scrollHeight;
          if (h === lastH) { stable++; } else { stable = 0; lastH = h; }
          if (stable >= 3 || round >= 60) { scroller.scrollTop = origTop; opts.scrolled = true; setTimeout(doCapture, 400); }
          else { step(); }
        }, 250);
      }
      step();
    });
  }

  window.__claudeCapture = capture;
  capture().then(function(result) {
    window.__claudeCaptureResult = result;
    console.log('[ClaudeCapture v4.1] Done -', result.messages.length, 'messages,', result.metadata.widgetCount, 'diagrams');
    downloadAll(result);
  });

  return 'ClaudeCapture v4.1 loaded - JSON + diagram HTML files downloading.';
})();
