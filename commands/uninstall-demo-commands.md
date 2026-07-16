# Uninstall Optimizely Demo Commands

Remove all Optimizely demo commands, the stored API token, the fake-data runner script, the cached Optimizely Slides package, and the permission rules from Claude settings.

Run the following steps:

## Step 1: Remove command files

```bash
rm -f ~/.claude/commands/fx-demo.md ~/.claude/commands/wx-demo.md ~/.claude/commands/add-slides.md ~/.claude/commands/fake-data.md ~/.claude/commands/update-demo-commands.md ~/.claude/commands/uninstall-demo-commands.md
```

## Step 2: Remove the API token, the fake-data runner, and the slides cache

```bash
rm -f ~/.optimizely/api_token ~/.optimizely/fake_data.py ~/.optimizely/opti_config.py && rm -rf ~/.optimizely/slides && rmdir ~/.optimizely 2>/dev/null; true
```

Note: this removes the local slides *cache* only. Demos that already have the deck copied in keep their copy — delete `optimizely-slides/` and `app/slides/` in a demo to remove it there.

## Step 3: Remove permission rules from Claude settings

```bash
python3 - <<'PYEOF'
import json, os

settings_file = os.path.expanduser('~/.claude/settings.json')
if not os.path.exists(settings_file):
    raise SystemExit(0)

with open(settings_file) as f:
    settings = json.load(f)

prefixes = [
    # Token storage
    'Bash(cat ~/.optimizely/api_token)',
    'Bash(mkdir -p ~/.optimizely',
    'Bash(echo * > ~/.optimizely/api_token',
    'Read(~/.optimizely/api_token)',
    'Write(~/.optimizely/api_token)',
    # Optimizely REST API reads
    'Bash(curl -s https://api.optimizely.com/v2/',
    'Bash(curl -s "https://api.optimizely.com/v2/',
    'Bash(curl -fsSL https://api.optimizely.com/v2/',
    # /fake-data runner (current location)
    'Bash(python3 ~/.optimizely/fake_data.py',
    # /fx-demo + /wx-demo project-config runner
    'Bash(python3 ~/.optimizely/opti_config.py',
    # /add-slides — package cache refresh + reads
    'Bash(curl -fsSL https://github.com/theodorecharles/opti-demo-claude-commands/',
    'Bash(cat ~/.optimizely/slides/VERSION)',
    'Read(~/.optimizely/slides/',
    # Obsolete /fake-data rules from earlier versions (kept for cleanup on
    # uninstall when the user upgraded through one of those versions)
    'Write(/tmp/opti_fake_data.py)',
    'Write(//private/tmp/opti_fake_data.py)',
    'Read(/tmp/opti_fake_data.py)',
    'Read(//private/tmp/opti_fake_data.py)',
    'Read(/tmp/**)',
    'Read(//private/tmp/**)',
    'Bash(python3 /tmp/opti_fake_data.py)',
    'Bash(rm -f /tmp/opti_fake_data.py)',
    'Bash(FD_* python3 /tmp/opti_fake_data.py)',
    'Bash(export FD_',
    'Bash(date ',
]

allow = settings.get('permissions', {}).get('allow', [])
allow = [r for r in allow if not any(r.startswith(p) for p in prefixes)]

if allow:
    settings['permissions']['allow'] = allow
else:
    settings.get('permissions', {}).pop('allow', None)
    if not settings.get('permissions'):
        settings.pop('permissions', None)

with open(settings_file, 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')
PYEOF
```

After all steps succeed, tell the user: **"Optimizely demo commands have been uninstalled. Commands, API token, runner script, slides cache, and permissions have all been removed."**
