# Update Optimizely Demo Commands

Download the latest versions of all Optimizely demo commands and the `/fake-data` runner script from GitHub.

Run the following commands:

```bash
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/fx-demo.md" -o ~/.claude/commands/fx-demo.md
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/wx-demo.md" -o ~/.claude/commands/wx-demo.md
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/fake-data.md" -o ~/.claude/commands/fake-data.md
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/update-demo-commands.md" -o ~/.claude/commands/update-demo-commands.md
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/uninstall-demo-commands.md" -o ~/.claude/commands/uninstall-demo-commands.md
mkdir -p ~/.optimizely && curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/scripts/opti_fake_data.py" -o ~/.optimizely/fake_data.py && chmod +x ~/.optimizely/fake_data.py
```

If all six succeed, tell the user: **"All demo commands and the /fake-data runner are up to date."**

If any fail, report which ones failed (likely a network issue).
