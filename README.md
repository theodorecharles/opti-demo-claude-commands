# Optimizely Demo Claude Commands

Claude Code slash commands for building Optimizely demo apps.

## Install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/install.sh)
```

The installer will:
- Download all commands to `~/.claude/commands/`
- Configure permissions so commands run without prompts
- Optionally set up your Optimizely API token

## Commands

| Command | Description |
|---------|-------------|
| `/fx-demo` | Build a Feature Experimentation demo (iOS SwiftUI or Web React/Next.js) |
| `/wx-demo` | Build a Web Experimentation demo site |
| `/fake-data` | Populate an experiment's Results page with batched fake decisions and conversions |
| `/update-demo-commands` | Update all commands to the latest version |
| `/uninstall-demo-commands` | Remove commands, API token, and permissions |

## API Token

Your token is stored locally at `~/.optimizely/api_token` and is never committed to this repo. If you didn't enter it during install, you'll be prompted on first run of `/fx-demo`, `/wx-demo`, or `/fake-data`.

To reset your token:

```bash
rm ~/.optimizely/api_token
```

You'll be prompted again on next use.

## Uninstall

Run `/uninstall-demo-commands` in Claude Code, or manually:

```bash
rm ~/.claude/commands/fx-demo.md ~/.claude/commands/wx-demo.md ~/.claude/commands/fake-data.md ~/.claude/commands/update-demo-commands.md ~/.claude/commands/uninstall-demo-commands.md
rm -rf ~/.optimizely
```
