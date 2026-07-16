#!/usr/bin/env python3
"""Sync the Claude Code permission allowlist for the Optimizely demo commands.

Single source of truth for the allow/remove rules. Run by BOTH `install.sh`
and `/update-demo-commands` so the two can never drift apart again.

Usage:
    python3 opti_permissions.py [SETTINGS_FILE]

SETTINGS_FILE defaults to ~/.claude/settings.json. Adds the rules the demo
commands need, purges obsolete rules from older versions, and writes the file
back. Idempotent — safe to run repeatedly.
"""
import json
import os
import sys

# Rules the demo commands need so they run without permission prompts.
ADD_RULES = [
    # --- Token storage -----------------------------------------------------
    "Bash(cat ~/.optimizely/api_token)",
    "Read(~/.optimizely/api_token)",
    "Bash(mkdir -p ~/.optimizely*)",
    "Bash(echo * > ~/.optimizely/api_token*)",
    "Write(~/.optimizely/api_token)",
    "Bash(chmod 600 ~/.optimizely/api_token)",
    # --- Optimizely REST API reads (/fx-demo + /wx-demo; /fake-data uses its
    # own runner). Trailing `*` matches the `-H "Authorization: ..."` flag and
    # quoted/unquoted URL variants. -----------------------------------------
    'Bash(curl -s https://api.optimizely.com/v2/*)',
    'Bash(curl -s "https://api.optimizely.com/v2/*)',
    'Bash(curl -fsSL https://api.optimizely.com/v2/*)',
    # --- Runners -----------------------------------------------------------
    # /fake-data runner — one rule covers `info`/`send` plus any flags.
    "Bash(python3 ~/.optimizely/fake_data.py *)",
    # /fx-demo + /wx-demo project-config runner — covers every subcommand.
    "Bash(python3 ~/.optimizely/opti_config.py *)",
    # This permissions runner itself, so /update-demo-commands can re-sync
    # prompt-free after the first run.
    "Bash(python3 ~/.optimizely/opti_permissions.py*)",
    "Bash(chmod +x ~/.optimizely/opti_permissions.py)",
    # --- Runner bootstrap --------------------------------------------------
    # If a runner is missing at runtime the skill (and /update-demo-commands)
    # re-fetch it from raw.githubusercontent.com (quoted + unquoted forms) and
    # mark it executable.
    'Bash(curl -fsSL https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/*)',
    'Bash(curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/*)',
    "Bash(chmod +x ~/.optimizely/opti_config.py)",
    # --- Datafile verification after enabling a flag (fx-demo Step 3) — CDN
    # read (quoted + unquoted). NB: the skill's `?cb=$(date +%s)` cache-buster
    # and `| grep | head` pipe can still trigger a prompt; the durable fix is
    # to move this check into opti_config.py. -------------------------------
    'Bash(curl -s https://cdn.optimizely.com/datafiles/*)',
    'Bash(curl -s "https://cdn.optimizely.com/datafiles/*)',
    # --- /add-slides — refresh the cached slides package + read it. --------
    "Bash(curl -fsSL https://github.com/theodorecharles/opti-demo-claude-commands/*)",
    "Bash(mkdir -p ~/.optimizely/slides*)",
    "Bash(cat ~/.optimizely/slides/VERSION)",
    "Read(~/.optimizely/slides/**)",
    # --- /fx-demo + /wx-demo app-build phase (opted in) --------------------
    # These let a full demo build (scaffold, install, run, inspect) proceed
    # without prompts. Deliberately BROAD: `npm`/`npx`/`node -e` already run
    # arbitrary code, so the accompanying shell-glue rules (cd/echo/cat/find/…)
    # don't widen the trust boundary further — they just stop multi-line build
    # blocks (which chain these together) from prompting as a whole. Delete
    # this block to return to Optimizely-config-only prompting.
    # Web (Next.js / React SDK)
    "Bash(npm install*)",
    "Bash(npm ci*)",
    "Bash(npm run *)",
    "Bash(npm audit*)",
    "Bash(npm fund*)",
    "Bash(npx create-next-app*)",
    "Bash(node -e *)",
    "Bash(node -v)",
    "Bash(node --version)",
    # iOS (SwiftUI / Xcode)
    "Bash(which xcodegen)",
    "Bash(brew install xcodegen)",
    "Bash(xcodegen*)",
    "Bash(xcodebuild *)",
    "Bash(xcrun simctl *)",
    "Bash(open -a Simulator*)",
    # Build-time inspection + shell glue
    "Bash(cd *)",
    "Bash(echo *)",
    "Bash(ls *)",
    "Bash(cat *)",
    "Bash(find *)",
    "Bash(sed -n *)",
    "Bash(grep *)",
    "Bash(head *)",
    "Bash(tail *)",
    # File ops for copying the slides deck into the app during the build
    # (cp -R the package, mkdir the target dirs). Not `rm` — a re-sync's
    # rm -rf stays behind a prompt on purpose.
    "Bash(cp *)",
    "Bash(mkdir *)",
]

# Rules added by earlier install.sh versions that are obsolete now.
REMOVE_RULES = {
    "Write(/tmp/opti_fake_data.py)",
    "Write(//private/tmp/opti_fake_data.py)",
    "Read(/tmp/opti_fake_data.py)",
    "Read(//private/tmp/opti_fake_data.py)",
    "Read(/tmp/**)",
    "Read(//private/tmp/**)",
    "Bash(python3 /tmp/opti_fake_data.py)",
    "Bash(rm -f /tmp/opti_fake_data.py)",
    "Bash(FD_* python3 /tmp/opti_fake_data.py)",
    "Bash(export FD_*)",
    "Bash(date *)",
}


def main():
    settings_file = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
        "~/.claude/settings.json")

    settings = {}
    if os.path.exists(settings_file):
        with open(settings_file) as f:
            settings = json.load(f)

    perms = settings.setdefault("permissions", {})
    before = set(perms.get("allow", []))
    after = (before - REMOVE_RULES) | set(ADD_RULES)
    perms["allow"] = sorted(after)

    os.makedirs(os.path.dirname(settings_file), exist_ok=True)
    with open(settings_file, "w") as f:
        json.dump(settings, f, indent=2)
        f.write("\n")

    added = sorted(set(ADD_RULES) - before)
    removed = sorted(before & REMOVE_RULES)
    print(f"==> Permissions synced in {settings_file}")
    print(f"    {len(perms['allow'])} allow rules "
          f"(+{len(added)} added, -{len(removed)} removed)")


if __name__ == "__main__":
    main()
