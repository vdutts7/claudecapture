#!/usr/bin/env zsh
SCRIPT_DIR="${0:A:h}"
[[ -f "$SCRIPT_DIR/.env" ]] && source "$SCRIPT_DIR/.env"

claudecanonical() {
  [[ -z "$CLAUDE_ORG_UUID" ]] && { echo "🔴 CLAUDE_ORG_UUID not set. cp .env.example .env and fill it in."; return 1; }
  local raw="${1:-$(pbpaste)}"
  local cid=$(echo "$raw" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | tail -1)
  [[ -z "$cid" ]] && { echo "🔴 usage: claudecanonical <chat-id-or-url>  (or copy one first)"; return 1; }
  echo "https://claude.ai/api/organizations/${CLAUDE_ORG_UUID}/chat_conversations/${cid}?tree=True&rendering_mode=messages&render_all_tools=true&consistency=eventual" | pbcopy
  echo "🟢 ${cid} -> copied. paste in address bar."
}

claudecanonical "$@"