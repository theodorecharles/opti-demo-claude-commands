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

echo "==> Commands installed to $DEST_DIR"

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
echo "  /fx-demo                — Build a Feature Experimentation demo"
echo "  /wx-demo                — Build a Web Experimentation demo"
echo "  /update-demo-commands   — Update all commands to the latest version"
echo ""
echo "Commands will notify you when updates are available."
