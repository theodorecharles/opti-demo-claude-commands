# Update Optimizely Demo Commands

Download the latest versions of all Optimizely demo commands, the `/fake-data`
runner script, and the Optimizely Slides package from GitHub.

Run the following commands:

```bash
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/fx-demo.md" -o ~/.claude/commands/fx-demo.md
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/wx-demo.md" -o ~/.claude/commands/wx-demo.md
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/add-slides.md" -o ~/.claude/commands/add-slides.md
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/fake-data.md" -o ~/.claude/commands/fake-data.md
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/update-demo-commands.md" -o ~/.claude/commands/update-demo-commands.md
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/uninstall-demo-commands.md" -o ~/.claude/commands/uninstall-demo-commands.md
mkdir -p ~/.optimizely && curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/scripts/opti_fake_data.py" -o ~/.optimizely/fake_data.py && chmod +x ~/.optimizely/fake_data.py
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/scripts/opti_config.py" -o ~/.optimizely/opti_config.py && chmod +x ~/.optimizely/opti_config.py
mkdir -p ~/.optimizely/slides && curl -fsSL "https://github.com/theodorecharles/opti-demo-claude-commands/archive/refs/heads/main.tar.gz" | tar -xz -C ~/.optimizely/slides --strip-components=2 opti-demo-claude-commands-main/slides
```

If all nine succeed, tell the user: **"All demo commands, the /fake-data and
project-config runners, and the Optimizely Slides package (v&lt;VERSION&gt;) are up
to date."** — read the version from `~/.optimizely/slides/VERSION`.

Note: refreshing the slides cache does **not** touch demos that already have the
deck installed. To pull the new baseline into an existing demo, run `/add-slides`
in that demo (it preserves the tuned `slides.config.ts`).

If any fail, report which ones failed (likely a network issue).
