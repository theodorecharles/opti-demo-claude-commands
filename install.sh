#!/bin/bash
set -e

REPO_URL="https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands"
DEST_DIR="$HOME/.claude/commands"
TOKEN_DIR="$HOME/.optimizely"
TOKEN_FILE="$TOKEN_DIR/api_token"

echo "==> Installing Optimizely Claude commands..."

# Ensure destination directory exists
mkdir -p "$DEST_DIR"

# Download latest commands
echo "    Downloading fx-demo.md..."
curl -fsSL "$REPO_URL/fx-demo.md" -o "$DEST_DIR/fx-demo.md"
echo "    Downloading wx-demo.md..."
curl -fsSL "$REPO_URL/wx-demo.md" -o "$DEST_DIR/wx-demo.md"
echo "    Downloading update-demo-commands.md..."
curl -fsSL "$REPO_URL/update-demo-commands.md" -o "$DEST_DIR/update-demo-commands.md"
echo "    Downloading uninstall-demo-commands.md..."
curl -fsSL "$REPO_URL/uninstall-demo-commands.md" -o "$DEST_DIR/uninstall-demo-commands.md"

echo "==> Commands installed to $DEST_DIR"

# Add permission rules to Claude settings so commands run without prompts
SETTINGS_FILE="$HOME/.claude/settings.json"
RULES=(
  'Bash(curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/*)'
  'Bash(cat ~/.optimizely/api_token)'
  'Read(~/.optimizely/api_token)'
  'Bash(diff -q ~/.claude/commands/* /tmp/*)'
  'Bash(mkdir -p ~/.optimizely*)'
  'Bash(echo * > ~/.optimizely/api_token*)'
  'Write(~/.optimizely/api_token)'
)

if [ -f "$SETTINGS_FILE" ]; then
    # Check if permissions.allow already exists
    if python3 -c "import json,sys; d=json.load(open('$SETTINGS_FILE')); sys.exit(0 if 'permissions' in d and 'allow' in d['permissions'] else 1)" 2>/dev/null; then
        # Merge rules into existing allow list
        python3 -c "
import json, sys
rules = json.loads(sys.argv[1])
with open('$SETTINGS_FILE', 'r') as f:
    settings = json.load(f)
existing = set(settings['permissions']['allow'])
for rule in rules:
    existing.add(rule)
settings['permissions']['allow'] = sorted(existing)
with open('$SETTINGS_FILE', 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')
" "$(printf '%s\n' "${RULES[@]}" | python3 -c "import json,sys; print(json.dumps([l.strip() for l in sys.stdin]))")"
    else
        # Add permissions block, merging with existing settings
        python3 -c "
import json, sys
rules = json.loads(sys.argv[1])
with open('$SETTINGS_FILE', 'r') as f:
    settings = json.load(f)
if 'permissions' not in settings:
    settings['permissions'] = {}
settings['permissions']['allow'] = rules
with open('$SETTINGS_FILE', 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')
" "$(printf '%s\n' "${RULES[@]}" | python3 -c "import json,sys; print(json.dumps([l.strip() for l in sys.stdin]))")"
    fi
else
    # Create settings file from scratch
    python3 -c "
import json, sys
rules = json.loads(sys.argv[1])
settings = {'permissions': {'allow': rules}}
with open('$SETTINGS_FILE', 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')
" "$(printf '%s\n' "${RULES[@]}" | python3 -c "import json,sys; print(json.dumps([l.strip() for l in sys.stdin]))")"
fi

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
echo "  /update-demo-commands       — Update all commands to the latest version"
echo "  /uninstall-demo-commands    — Remove commands, token, and permissions"
echo ""
echo "Commands will notify you when updates are available."
