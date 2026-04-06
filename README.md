# Optimizely Demo Claude Commands

Claude Code slash commands for building Optimizely demo apps.

## Install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/install.sh)
```

This installs two commands into `~/.claude/commands/`:

- **`/fx-demo`** — Build a Feature Experimentation demo (iOS SwiftUI or Web React/Next.js)
- **`/wx-demo`** — Build a Web Experimentation demo site

On first run, you'll be prompted for your Optimizely API token (stored locally at `~/.optimizely/api_token`).

## Update

Re-run the same install command to pull the latest versions.

## API Token

Your token is stored at `~/.optimizely/api_token` and never committed to this repo. To reset it:

```bash
rm ~/.optimizely/api_token
```

You'll be prompted again on next use.
