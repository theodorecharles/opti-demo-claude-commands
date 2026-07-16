#!/bin/bash
set -e

# Pick the branch to install from, in priority order:
#   1. $OPTI_BRANCH if explicitly set (e.g. `OPTI_BRANCH=foo ./install.sh`)
#   2. The current git branch, if this script is run from inside the repo clone
#   3. "main" as the final fallback (e.g. when piped from curl)
if [ -n "$OPTI_BRANCH" ]; then
    BRANCH="$OPTI_BRANCH"
elif SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" \
        && git -C "$SCRIPT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
    DETECTED=$(git -C "$SCRIPT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [ -n "$DETECTED" ] && [ "$DETECTED" != "HEAD" ]; then
        BRANCH="$DETECTED"
    else
        BRANCH="main"
    fi
else
    BRANCH="main"
fi

REPO_BASE="https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/${BRANCH}"
REPO_URL="${REPO_BASE}/commands"
SCRIPTS_URL="${REPO_BASE}/scripts"
DEST_DIR="$HOME/.claude/commands"
TOKEN_DIR="$HOME/.optimizely"
TOKEN_FILE="$TOKEN_DIR/api_token"
RUNNER_FILE="$TOKEN_DIR/fake_data.py"
CONFIG_FILE="$TOKEN_DIR/opti_config.py"
PERMS_FILE="$TOKEN_DIR/opti_permissions.py"

echo "==> Installing Optimizely Claude commands from branch: $BRANCH"

# Ensure destination directories exist
mkdir -p "$DEST_DIR"
mkdir -p "$TOKEN_DIR"

# Download latest commands
echo "    Downloading fx-demo.md..."
curl -fsSL "$REPO_URL/fx-demo.md" -o "$DEST_DIR/fx-demo.md"
echo "    Downloading wx-demo.md..."
curl -fsSL "$REPO_URL/wx-demo.md" -o "$DEST_DIR/wx-demo.md"
echo "    Downloading fake-data.md..."
curl -fsSL "$REPO_URL/fake-data.md" -o "$DEST_DIR/fake-data.md"
echo "    Downloading add-slides.md..."
curl -fsSL "$REPO_URL/add-slides.md" -o "$DEST_DIR/add-slides.md"
echo "    Downloading update-demo-commands.md..."
curl -fsSL "$REPO_URL/update-demo-commands.md" -o "$DEST_DIR/update-demo-commands.md"
echo "    Downloading uninstall-demo-commands.md..."
curl -fsSL "$REPO_URL/uninstall-demo-commands.md" -o "$DEST_DIR/uninstall-demo-commands.md"

echo "==> Commands installed to $DEST_DIR"

# Download the /fake-data runner script alongside the API token
echo "    Downloading fake_data.py runner..."
curl -fsSL "$SCRIPTS_URL/opti_fake_data.py" -o "$RUNNER_FILE"
chmod +x "$RUNNER_FILE"
echo "==> Runner installed to $RUNNER_FILE"

# Download the project-configuration runner (used by /fx-demo and /wx-demo to
# provision projects, attributes, flags, events, and audiences).
echo "    Downloading opti_config.py runner..."
curl -fsSL "$SCRIPTS_URL/opti_config.py" -o "$CONFIG_FILE"
chmod +x "$CONFIG_FILE"
echo "==> Runner installed to $CONFIG_FILE"

# Download the permissions runner — the single source of truth for the Claude
# allowlist, shared with /update-demo-commands so the two never drift apart.
echo "    Downloading opti_permissions.py runner..."
curl -fsSL "$SCRIPTS_URL/opti_permissions.py" -o "$PERMS_FILE"
chmod +x "$PERMS_FILE"
echo "==> Runner installed to $PERMS_FILE"

# Cache the Optimizely Slides package (the interactive deck /add-slides drops
# into a demo). Pulled as a one-shot tarball of the repo's slides/ folder.
SLIDES_DIR="$TOKEN_DIR/slides"
TOPDIR="opti-demo-claude-commands-${BRANCH//\//-}"
echo "    Downloading Optimizely Slides package..."
mkdir -p "$SLIDES_DIR"
if curl -fsSL "https://github.com/theodorecharles/opti-demo-claude-commands/archive/refs/heads/${BRANCH}.tar.gz" \
     | tar -xz -C "$SLIDES_DIR" --strip-components=2 "${TOPDIR}/slides" 2>/dev/null; then
    echo "==> Slides package cached at $SLIDES_DIR (v$(cat "$SLIDES_DIR/VERSION" 2>/dev/null || echo '?'))"
else
    echo "    (Slides download skipped — /add-slides will fetch it on first run)"
fi

# Configure Claude permissions via the shared permissions runner — the single
# source of truth for the allowlist (also run by /update-demo-commands, so the
# two can never drift apart). It adds the rules our commands need and purges
# obsolete rules from older versions.
SETTINGS_FILE="$HOME/.claude/settings.json"
python3 "$PERMS_FILE" "$SETTINGS_FILE"

echo "==> Permissions configured (commands will run without prompts)"

# Prompt for API token if not already stored
if [ -f "$TOKEN_FILE" ] && [ -s "$TOKEN_FILE" ]; then
    echo "==> Optimizely API token already configured at $TOKEN_FILE"
else
    echo ""
    echo "==> No Optimizely API token found."
    echo "    You can enter it now, or skip and you'll be prompted on first use."
    echo ""
    read -p "    Optimizely API token (or press Enter to skip): " token
    if [ -n "$token" ]; then
        mkdir -p "$TOKEN_DIR"
        echo "$token" > "$TOKEN_FILE"
        chmod 600 "$TOKEN_FILE"
        echo "==> Token saved to $TOKEN_FILE"
    else
        echo "==> Skipped. You'll be prompted when you first run /fx-demo or /wx-demo."
    fi
fi

echo ""
echo "Done! Available commands:"
echo "  /fx-demo                    — Build a Feature Experimentation demo"
echo "  /wx-demo                    — Build a Web Experimentation demo"
echo "  /add-slides                 — Add the interactive Optimizely deck to a demo"
echo "  /fake-data                  — Populate an experiment's Results page with fake data"
echo "  /update-demo-commands       — Update all commands to the latest version"
echo "  /uninstall-demo-commands    — Remove commands, token, and permissions"
echo ""
echo "Commands will notify you when updates are available."
