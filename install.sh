#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${BLUE}[ghost-mcp]${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
fatal()   { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

# ─── macOS gate ──────────────────────────────────────────────────────────────

[[ "$(uname)" == "Darwin" ]] || fatal "This install script supports macOS only."

echo ""
echo -e "${BOLD}ghost-mcp installer${RESET}"
echo "──────────────────────────────────────────"
echo ""

# ─── Homebrew ────────────────────────────────────────────────────────────────

if ! command -v brew &>/dev/null; then
  info "Homebrew not found — installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Apple Silicon puts Homebrew at /opt/homebrew; add it to this session's PATH
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -f /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  success "Homebrew installed"
else
  success "Homebrew found ($(brew --version | head -1))"
fi

# ─── Node.js ─────────────────────────────────────────────────────────────────

NODE_MIN_MAJOR=20

check_node() {
  if command -v node &>/dev/null; then
    local major
    major=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
    [[ "$major" -ge "$NODE_MIN_MAJOR" ]]
  else
    return 1
  fi
}

if ! check_node; then
  info "Node.js v${NODE_MIN_MAJOR}+ not found — installing node@22 via Homebrew..."
  brew install node@22
  # node@22 is keg-only, so we need to prepend its bin for this session
  NODE22_BIN="$(brew --prefix node@22)/bin"
  export PATH="${NODE22_BIN}:$PATH"
  if ! check_node; then
    fatal "Node.js v${NODE_MIN_MAJOR}+ could not be installed. Install it manually and re-run."
  fi
  success "Node.js installed ($(node --version))"
else
  success "Node.js found ($(node --version))"
fi

# ─── Install dependencies ─────────────────────────────────────────────────────

info "Installing npm dependencies..."
cd "$SCRIPT_DIR"
npm install 2>&1 | grep -v '^npm warn' || true
success "Dependencies installed"

# ─── Build ───────────────────────────────────────────────────────────────────

info "Building TypeScript..."
cd "$SCRIPT_DIR"
npm run build

[[ -f "${SCRIPT_DIR}/build/server.js" ]] || fatal "Build completed but build/server.js is missing — check tsconfig.json."
success "Build complete"

# ─── Ghost credentials ───────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}Ghost CMS Configuration${RESET}"
echo ""

read -rp "  Ghost API URL (e.g. https://yourblog.com): " GHOST_API_URL
while [[ -z "$GHOST_API_URL" ]]; do
  warn "GHOST_API_URL cannot be empty."
  read -rp "  Ghost API URL: " GHOST_API_URL
done

read -rsp "  Ghost Admin API Key: " GHOST_ADMIN_API_KEY
echo ""
while [[ -z "$GHOST_ADMIN_API_KEY" ]]; do
  warn "GHOST_ADMIN_API_KEY cannot be empty."
  read -rsp "  Ghost Admin API Key: " GHOST_ADMIN_API_KEY
  echo ""
done

read -rp "  Ghost API Version [v5.0]: " GHOST_API_VERSION_INPUT
GHOST_API_VERSION="${GHOST_API_VERSION_INPUT:-v5.0}"

# ─── Register with Claude Desktop ────────────────────────────────────────────

CLAUDE_DESKTOP_CONFIG="${HOME}/Library/Application Support/Claude/claude_desktop_config.json"
CLAUDE_DESKTOP_DIR="${HOME}/Library/Application Support/Claude"

info "Registering ghost-mcp with Claude Desktop..."

mkdir -p "$CLAUDE_DESKTOP_DIR"

# Claude Desktop launches with a minimal env — 'node' won't resolve via PATH.
# Capture the absolute binary path now so the config is self-contained.
NODE_BIN="$(command -v node)"
[[ -n "$NODE_BIN" ]] || fatal "Cannot resolve absolute path for node — ensure Node.js is on PATH and re-run."

node << NODEJS
const fs = require('fs');
const configPath = '${CLAUDE_DESKTOP_CONFIG}';
const serverPath = '${SCRIPT_DIR}/build/server.js';
const nodeBin   = '${NODE_BIN}';

let config = {};
if (fs.existsSync(configPath)) {
  const raw = fs.readFileSync(configPath, 'utf8');
  try { config = JSON.parse(raw); } catch (e) {
    process.stderr.write('WARNING: claude_desktop_config.json is not valid JSON — will overwrite.\n');
  }
}

config.mcpServers = config.mcpServers || {};
config.mcpServers['ghost-mcp'] = {
  command: nodeBin,
  args: [serverPath],
  env: {
    GHOST_API_URL: '${GHOST_API_URL}',
    GHOST_ADMIN_API_KEY: '${GHOST_ADMIN_API_KEY}',
    GHOST_API_VERSION: '${GHOST_API_VERSION}'
  }
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
process.stdout.write('written\n');
NODEJS

success "Claude Desktop config updated"

# ─── Register with Claude Code ───────────────────────────────────────────────

info "Registering ghost-mcp with Claude Code..."

if ! command -v claude &>/dev/null; then
  fatal "Claude Code CLI ('claude') not found. Install Claude Code and re-run."
fi

serverPath="${SCRIPT_DIR}/build/server.js"

# Remove any existing entry from all scopes so 'add' is always idempotent
claude mcp remove ghost-mcp --scope user 2>/dev/null || true
claude mcp remove ghost-mcp --scope local 2>/dev/null || true
claude mcp remove ghost-mcp --scope project 2>/dev/null || true

claude mcp add ghost-mcp \
  --scope user \
  -e "GHOST_API_URL=${GHOST_API_URL}" \
  -e "GHOST_ADMIN_API_KEY=${GHOST_ADMIN_API_KEY}" \
  -e "GHOST_API_VERSION=${GHOST_API_VERSION}" \
  -- node "$serverPath"

success "ghost-mcp registered (user scope)"

# ─── Done ────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}Setup complete!${RESET}"
echo ""
echo -e "  ${BOLD}Server path:${RESET}  ${SCRIPT_DIR}/build/server.js"
echo -e "  ${BOLD}Claude Code:${RESET}  claude mcp list (user scope)"
echo -e "  ${BOLD}Claude Desktop:${RESET}  ~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo -e "${BLUE}Next steps:${RESET}"
echo "  1. Restart Claude Code (quit and reopen, or run: claude mcp restart)"
echo "  2. Restart Claude Desktop (quit and reopen from the menu bar)"
echo "  3. Verify Claude Code: /mcp"
echo "  4. Try: \"List my Ghost posts\""
echo ""
echo -e "${YELLOW}To update your Ghost credentials, re-run:${RESET}  ./install.sh"
echo ""
