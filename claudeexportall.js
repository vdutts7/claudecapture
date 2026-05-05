// ==========================================================================
// claudeexportall - bulk export all conversations + projects + docs + memory
// uses canonical params for full tool results, thinking blocks, ms timestamps
// paste into DevTools console on claude.ai
// ==========================================================================
(async () => {
    const L = (e, m) => console.log(`${e} ${m}`);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const PARAMS = "?tree=True&rendering_mode=messages&render_all_tools=true&consistency=eventual";
    const get = async (path) => {
      try {
        const r = await fetch(path, { credentials: "include" });
        if (!r.ok) return { _err: r.status };
        return await r.json();
      } catch (e) { return { _err: e.message }; }
    };
    const ok = d => !d?._err;
  
    L("🌕", "claudeexportall v3 (canonical params)...");
  
    // auto-detect chat-capable org
    const orgs = await get("/api/organizations");
    if (!ok(orgs) || !orgs.length) { L("🔴", "auth failed - are you on claude.ai?"); return; }
    const chatOrg = orgs.find(o => {
      const caps = o.capabilities || {};
      return Array.isArray(caps) ? caps.includes("chat") : typeof caps === "object" && "chat" in caps;
    }) || orgs.find(o => JSON.stringify(o.capabilities || {}).match(/chat|claude_pro|claude_max/)) || orgs[orgs.length - 1];
    const org = chatOrg.uuid;
    L("🟢", `org: ${chatOrg.name} (${org})`);
  
    const out = { _meta: { extracted: new Date().toISOString(), version: "v3", org_id: org, org_name: chatOrg.name, params: PARAMS }, organizations: orgs };
  
    // account-level
    for (const [name, path] of [
      ["account", "/api/account"], ["bootstrap", "/api/bootstrap"],
      ["styles", `/api/organizations/${org}/styles`],
      ["memory", `/api/organizations/${org}/memory`],
    ]) {
      const d = await get(path);
      if (ok(d)) { out[name] = d; L("🟢", name); }
      else L("🌑", `${name} -> ${d._err}`);
      await sleep(200);
    }
  
    // projects + instructions + docs + linked convos
    L("🌕", "projects...");
    const projects = await get(`/api/organizations/${org}/projects`);
    if (ok(projects)) {
      const plist = Array.isArray(projects) ? projects : (projects.results || projects.data || []);
      out.projects = [];
      L("🟢", `${plist.length} projects`);
      for (const p of plist) {
        const pid = p.uuid || p.id;
        const detail = await get(`/api/organizations/${org}/projects/${pid}`);
        const docs = await get(`/api/organizations/${org}/projects/${pid}/docs`);
        const convos = await get(`/api/organizations/${org}/projects/${pid}/conversations`);
        out.projects.push({
          ...p,
          _detail: ok(detail) ? detail : null,
          _instructions: ok(detail) ? (detail.prompt_template || null) : null,
          _docs: ok(docs) ? docs : null,
          _conversations: ok(convos) ? convos : null,
        });
        L("🟢", `  ${p.name || pid}`);
        await sleep(300);
      }
    } else { L("🔴", `projects -> ${projects._err}`); }
  
    // conversations with canonical params
    L("🌕", "conversations (canonical)...");
    const convos = await get(`/api/organizations/${org}/chat_conversations`);
    if (ok(convos)) {
      const clist = Array.isArray(convos) ? convos : (convos.results || convos.data || []);
      out.conversations = [];
      L("🟢", `${clist.length} conversations`);
      for (let i = 0; i < clist.length; i++) {
        const c = clist[i];
        const cid = c.uuid || c.id;
        const full = await get(`/api/organizations/${org}/chat_conversations/${cid}${PARAMS}`);
        if (ok(full)) {
          out.conversations.push(full);
          if ((i + 1) % 25 === 0 || i === 0) {
            const msgs = full.chat_messages || [];
            L("🌕", `  [${i + 1}/${clist.length}] ${c.name || 'unnamed'} (${msgs.length} msgs)`);
          }
        } else {
          out.conversations.push({ ...c, _err: full._err });
          if (full._err === 429) { L("🌕", "  rate limited, 5s..."); await sleep(5000); }
        }
        await sleep(300);
      }
      L("🟢", `${out.conversations.length} conversations extracted`);
    } else { L("🔴", `conversations -> ${convos._err}`); }
  
    // download with copy() fallback
    L("🌕", "downloading...");
    const json = JSON.stringify(out, null, 2);
    const mb = (new Blob([json]).size / 1048576).toFixed(1);
    try {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      a.download = `claude-full-export-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      L("🟢", `${mb} MB downloaded.`);
    } catch (e) {
      try { copy(json); L("🟢", `${mb} MB copied to clipboard. paste into file.`); }
      catch (e2) { console.log("EXPORT_DATA", out); L("🟢", `${mb} MB in console as EXPORT_DATA.`); }
    }
  
    L("🟢", `projects: ${out.projects?.length || 0}`);
    L("🟢", `conversations: ${out.conversations?.length || 0}`);
  })();
  