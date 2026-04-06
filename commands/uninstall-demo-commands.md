# Uninstall Optimizely Demo Commands

Remove all Optimizely demo commands, the stored API token, and the permission rules from Claude settings.

Run the following steps:

## Step 1: Remove command files

```bash
rm -f ~/.claude/commands/fx-demo.md ~/.claude/commands/wx-demo.md ~/.claude/commands/update-demo-commands.md ~/.claude/commands/uninstall-demo-commands.md
```

## Step 2: Remove API token

```bash
rm -f ~/.optimizely/api_token && rmdir ~/.optimizely 2>/dev/null; true
```

## Step 3: Remove permission rules from Claude settings

```bash
python3 -c "
import json, os

settings_file = os.path.expanduser('~/.claude/settings.json')
if not os.path.exists(settings_file):
    exit(0)

with open(settings_file, 'r') as f:
    settings = json.load(f)

if 'permissions' in settings and 'allow' in settings['permissions']:
    prefixes = [
        'Bash(cat ~/.optimizely/api_token)',
        'Bash(mkdir -p ~/.optimizely',
        'Bash(echo * > ~/.optimizely/api_token',
        'Read(~/.optimizely/api_token)',
        'Write(~/.optimizely/api_token)',
    ]
    settings['permissions']['allow'] = [
        r for r in settings['permissions']['allow']
        if not any(r.startswith(p) for p in prefixes)
    ]
    if not settings['permissions']['allow']:
        del settings['permissions']['allow']
    if not settings['permissions']:
        del settings['permissions']

with open(settings_file, 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')
"
```

After all steps succeed, tell the user: **"Optimizely demo commands have been uninstalled. Commands, API token, and permissions have all been removed."**
