#!/usr/bin/env python3
"""Optimizely project configuration runner.

Provisions the Optimizely-side config for a demo (project, SDK key, attributes,
flags, events, audiences) via the REST API — faster and more reliably than
hand-writing curl per call. Prints JSON the caller can read.

Subcommands
-----------
  project    Create a project (+ unrestrict prod, return SDK keys / snippet).
  attributes Bulk-create custom attributes.
  flags      Bulk-create feature flags (FX) + their custom variations.
  events     Bulk-create custom events.
  audiences  Bulk-create audiences — resolves attribute key -> DISPLAY NAME.
  rules      Add targeting rules (a/b split or targeted_delivery) that serve
             specific variations, optionally scoped to an audience.
  enable-flag  Turn a flag ON at 100% in an environment (JSON Patch ruleset).

Each create subcommand reads a spec (a JSON array) from --spec FILE, --json
'<inline>', or stdin. Existing entities are skipped (match by key/name) so
re-runs are safe.

  THE AUDIENCE FIX
  ----------------
  Optimizely's /v2/audiences validates a custom_attribute condition's `name`
  against the attribute's DISPLAY NAME, not its key. Referencing the key yields
  `Custom attribute '<key>' does not exist` even though the attribute exists —
  which looks like a propagation delay but is not. This script always fetches
  the project's attributes and rewrites each condition to use the display name,
  so audiences create immediately. Use --dry-run to print the exact conditions
  without sending them.

Reads the API token from $OPTIMIZELY_API_TOKEN or ~/.optimizely/api_token.

Spec formats
------------
  attributes: [{"key": "loyalty_tier", "name": "Loyalty Tier",
                "description": "..."}]
  flags:      [{"key": "homepage_hero", "name": "Homepage Hero",
                "description": "...",
                "variable_definitions": {"headline": {"key": "headline",
                    "type": "string", "default_value": "Hi", "description": ""}},
                "variations": [
                    {"key": "control",   "name": "Control",
                     "variable_values": {"headline": "Hi"}},
                    {"key": "treatment", "name": "Treatment",
                     "variable_values": {"headline": "Welcome back!"}}]}]
                # `variations` is optional. Each entry becomes a real, named
                # flag variation (beyond the auto-created on/off) whose
                # variable_values override the defaults. Missing variables are
                # backfilled from the flag's defaults, and every value is coerced
                # to the string the flags API expects.
  events:     [{"key": "add_to_cart", "name": "Add To Cart", "description": ""}]
  audiences:  [
    {"name": "Gold Members", "attribute": "loyalty_tier", "value": "gold"},
    {"name": "Gold on Mobile", "all": [
        {"attribute": "loyalty_tier", "value": "gold"},
        {"attribute": "device_type", "value": "mobile"}]},
    {"name": "Gold or Silver", "any": [
        {"attribute": "loyalty_tier", "value": "gold"},
        {"attribute": "loyalty_tier", "value": "silver"}]}
  ]
  Each condition: {"attribute": "<key>", "value": <any>, "match_type": "exact"}.
  match_type defaults to "exact". `attribute` is the attribute KEY (the script
  maps it to the display name). You may also pass "name" (the display name) or a
  raw "conditions" string to bypass resolution entirely.

  rules:      [
    # A/B split of two variations to everyone (50/50), measured by an event:
    {"key": "hero_ab", "name": "Hero A/B", "type": "a/b",
     "distribution": {"control": 5000, "treatment": 5000},
     "metrics": ["purchase_completed"]},
    # Deliver one variation to a targeted audience (by audience NAME):
    {"key": "gold_hero", "name": "Gold members get treatment",
     "type": "targeted_delivery", "audience": "Gold Loyalty Tier",
     "variation": "treatment"}
  ]
  Rule fields: `key`, `name`, `type` ("a/b" | "targeted_delivery", default
  "a/b"), `enabled` (default true) and `percentage_included` (basis points,
  default 10000 = 100% of matched traffic enters the rule). Targeting: pass
  `audience` (name -> resolved to id) or `audience_id`; omit to target everyone.
  Variations: `distribution` maps variation key -> basis points (must sum to
  10000) for an a/b split; or pass `variation` (single key) / `variations` (list,
  split evenly) as a shorthand. Referenced variations must already exist on the
  flag (create them in the `flags` step). Metrics: `a/b` rules REQUIRE >=1
  `metrics` entry — an event key string, or {"event": "<key>", "aggregator":
  "unique", "winning_direction": "increasing", "scope": "visitor"} to override
  defaults. `rules` takes --flag and --env-key.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://api.optimizely.com"
TOKEN_FILE = os.path.expanduser("~/.optimizely/api_token")


def die(msg, code=1):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


def load_token():
    env = os.environ.get("OPTIMIZELY_API_TOKEN", "").strip()
    if env:
        return env
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE) as f:
            t = f.read().strip()
            if t:
                return t
    die(f"no API token. Set $OPTIMIZELY_API_TOKEN or write one to {TOKEN_FILE}.")


def api(method, path, token, body=None, allow=()):
    """Call the Optimizely REST API. `path` includes the leading slash and API
    version prefix (e.g. /v2/projects or /flags/v1/...). Returns (status, json)."""
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        parsed = None
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = raw[:400].decode(errors="replace")
        if e.code in allow:
            return e.code, parsed
        die(f"{method} {path} -> HTTP {e.code}: {parsed}")


def api_list(path, token):
    """GET a paginated list endpoint, returning all rows. `path` includes the
    query string (project_id etc.); per_page/page are appended. Handles both v2
    endpoints (bare JSON array) and flags v1 (a dict with an `items` array)."""
    out = []
    page = 1
    sep = "&" if "?" in path else "?"
    while True:
        status, resp = api("GET", f"{path}{sep}per_page=100&page={page}", token)
        if isinstance(resp, dict):
            rows = resp.get("items", [])
        elif isinstance(resp, list):
            rows = resp
        else:
            rows = []
        if not rows:
            break
        out.extend(rows)
        if len(rows) < 100:
            break
        page += 1
    return out


def load_spec(args):
    if getattr(args, "spec", None):
        with open(args.spec) as f:
            return json.load(f)
    if getattr(args, "json", None):
        return json.loads(args.json)
    if not sys.stdin.isatty():
        text = sys.stdin.read().strip()
        if text:
            return json.loads(text)
    die("no spec provided. Use --spec FILE, --json '<json>', or pipe JSON on stdin.")


def as_list(spec):
    return spec if isinstance(spec, list) else [spec]


def stringify(v):
    """Coerce a variable value to the string the flags API stores. booleans ->
    "true"/"false", dict/list (json vars) -> compact JSON, everything else str()."""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (dict, list)):
        return json.dumps(v)
    return str(v)


# --------------------------------------------------------------------------- #
# project
# --------------------------------------------------------------------------- #
def cmd_project(args):
    token = load_token()
    platform = args.platform
    body = {
        "name": args.name,
        "description": args.description or f"Demo project ({platform})",
        "platform": platform,
    }
    if platform == "custom":
        # REQUIRED for a real Feature Experimentation (flags) project. Without
        # it the API creates a legacy FullStack project with no flags v1 API.
        body["is_flags_enabled"] = True

    status, proj = api("POST", "/v2/projects", token, body)
    pid = proj["id"]

    result = {
        "project_id": pid,
        "name": proj.get("name"),
        "platform": proj.get("platform"),
        "is_flags_enabled": proj.get("is_flags_enabled"),
        "account_id": proj.get("account_id"),
    }

    if platform == "web":
        result["snippet_url"] = f"https://cdn.optimizely.com/js/{pid}.js"
        result["snippet_tag"] = f'<script src="https://cdn.optimizely.com/js/{pid}.js"></script>'
        print(json.dumps(result, indent=2))
        return

    # FX: unrestrict prod + collect SDK keys.
    envs = api_list(f"/v2/environments?project_id={pid}", token)
    env_out = []
    for e in envs:
        eid = e["id"]
        if e.get("has_restricted_permissions"):
            api("PATCH", f"/v2/environments/{eid}", token,
                {"has_restricted_permissions": False}, allow=(400, 403))
        detail_status, detail = api("GET", f"/v2/environments/{eid}", token)
        sdk_key = (detail.get("datafile") or {}).get("sdk_key")
        env_out.append({
            "id": eid,
            "key": e.get("key"),
            "name": e.get("name"),
            "is_primary": e.get("is_primary"),
            "sdk_key": sdk_key,
        })
        if e.get("is_primary"):
            result["prod_sdk_key"] = sdk_key
            result["prod_env_key"] = e.get("key")
        else:
            result["dev_sdk_key"] = sdk_key
            result["dev_env_key"] = e.get("key")
    result["environments"] = env_out
    print(json.dumps(result, indent=2))


# --------------------------------------------------------------------------- #
# attributes
# --------------------------------------------------------------------------- #
def cmd_attributes(args):
    token = load_token()
    pid = args.project
    existing = {a["key"]: a for a in api_list(f"/v2/attributes?project_id={pid}", token)}
    results = []
    for item in as_list(load_spec(args)):
        key = item["key"]
        if key in existing:
            results.append({"key": key, "status": "exists", "id": existing[key]["id"]})
            continue
        body = {
            "project_id": int(pid),
            "key": key,
            "name": item.get("name", key),
            "description": item.get("description", ""),
        }
        status, resp = api("POST", "/v2/attributes", token, body, allow=(409,))
        results.append({
            "key": key,
            "status": "created" if status in (200, 201) else "exists",
            "id": (resp or {}).get("id") if isinstance(resp, dict) else None,
            "name": body["name"],
        })
    print(json.dumps({"attributes": results}, indent=2))


# --------------------------------------------------------------------------- #
# flags
# --------------------------------------------------------------------------- #
def _flag_variable_defaults(pid, flag_key, token, spec_defs=None):
    """Map variable key -> default value (as a string) for a flag. Prefers the
    definitions in the spec (present when we just created the flag); otherwise
    GETs the flag so variations on a pre-existing flag still backfill correctly."""
    if spec_defs:
        return {vk: stringify(vd.get("default_value", "")) for vk, vd in spec_defs.items()}
    _, flag = api("GET", f"/flags/v1/projects/{pid}/flags/{flag_key}", token, allow=(404,))
    vdefs = (flag or {}).get("variable_definitions") or {} if isinstance(flag, dict) else {}
    return {vk: stringify(vd.get("default_value", "")) for vk, vd in vdefs.items()}


def _create_variations(pid, flag_key, variations, token, spec_defs=None):
    """Create custom flag variations (idempotent by key). Each variation's
    variable_values are backfilled from the flag defaults so every variation
    defines the same variables, which the flags API requires."""
    _, resp = api("GET", f"/flags/v1/projects/{pid}/flags/{flag_key}/variations?per_page=100",
                  token, allow=(404,))
    have = {v["key"] for v in (resp.get("items", []) if isinstance(resp, dict) else [])
            if isinstance(v, dict) and "key" in v}
    defaults = _flag_variable_defaults(pid, flag_key, token, spec_defs)
    out = []
    for v in variations:
        vkey = v["key"]
        if vkey in have:
            out.append({"key": vkey, "status": "exists"})
            continue
        values = dict(defaults)
        for k, val in (v.get("variable_values") or {}).items():
            values[k] = stringify(val)
        # The variations API takes `variables` as a map of key -> {value}. A flat
        # `variable_values` map is rejected ("Unknown field"), and an inner `key`
        # is rejected as read-only — only `value` is writable.
        body = {
            "key": vkey,
            "name": v.get("name", vkey),
            "description": v.get("description", ""),
            "variables": {k: {"value": val} for k, val in values.items()},
        }
        status, _ = api("POST", f"/flags/v1/projects/{pid}/flags/{flag_key}/variations",
                        token, body, allow=(409,))
        out.append({"key": vkey, "status": "created" if status in (200, 201) else "exists"})
    return out


def cmd_flags(args):
    token = load_token()
    pid = args.project
    # Flags v1 pagination differs from v2 (it rejects a `page` param and returns
    # {items: [...]}). Demos have well under 100 flags, so one page is enough.
    _, resp = api("GET", f"/flags/v1/projects/{pid}/flags?per_page=100", token)
    flag_items = resp.get("items", []) if isinstance(resp, dict) else (resp if isinstance(resp, list) else [])
    existing = {f["key"] for f in flag_items if isinstance(f, dict) and "key" in f}
    results = []
    for item in as_list(load_spec(args)):
        key = item["key"]
        spec_defs = None
        if item.get("variable_definitions"):
            # Every variable must carry a "key" matching its dict key.
            spec_defs = {}
            for vk, vd in item["variable_definitions"].items():
                vd = dict(vd)
                vd.setdefault("key", vk)
                spec_defs[vk] = vd
        if key in existing:
            row = {"key": key, "status": "exists"}
        else:
            body = {
                "key": key,
                "name": item.get("name", key),
                "description": item.get("description", ""),
            }
            if spec_defs:
                body["variable_definitions"] = spec_defs
            status, resp = api("POST", f"/flags/v1/projects/{pid}/flags", token, body, allow=(409,))
            row = {"key": key, "status": "created" if status in (200, 201) else "exists"}
        # Create custom variations whether the flag is new or pre-existing — a
        # re-run may be filling in variations that weren't there before.
        if item.get("variations"):
            row["variations"] = _create_variations(pid, key, item["variations"], token, spec_defs)
        results.append(row)
    print(json.dumps({"flags": results}, indent=2))


# --------------------------------------------------------------------------- #
# events
# --------------------------------------------------------------------------- #
def cmd_events(args):
    token = load_token()
    pid = args.project
    existing = {e["key"] for e in api_list(f"/v2/events?project_id={pid}", token)
                if isinstance(e, dict) and "key" in e}
    results = []
    for item in as_list(load_spec(args)):
        key = item["key"]
        if key in existing:
            results.append({"key": key, "status": "exists"})
            continue
        body = {
            "key": key,
            "name": item.get("name", key),
            "description": item.get("description", ""),
            "event_type": item.get("event_type", "custom"),
        }
        status, resp = api("POST", f"/v2/projects/{pid}/custom_events", token, body, allow=(409,))
        results.append({
            "key": key,
            "status": "created" if status in (200, 201) else "exists",
            "id": (resp or {}).get("id") if isinstance(resp, dict) else None,
        })
    print(json.dumps({"events": results}, indent=2))


# --------------------------------------------------------------------------- #
# audiences  (the fix lives here)
# --------------------------------------------------------------------------- #
def _leaf(cond, name_by_key, name_set):
    """Build one custom_attribute condition object using the DISPLAY NAME."""
    if "name" in cond and "attribute" not in cond:
        display = cond["name"]  # caller passed a display name explicitly
        if display not in name_set:
            die(f"no attribute named {display!r} in this project. "
                f"Known display names: {sorted(name_set)}")
    else:
        key = cond["attribute"]
        if key not in name_by_key:
            die(f"attribute key {key!r} not found in project. Create it first. "
                f"Known keys: {sorted(name_by_key)}")
        display = name_by_key[key]
    return {
        "match_type": cond.get("match_type", "exact"),
        "name": display,
        "type": "custom_attribute",
        "value": cond["value"],
    }


def _build_conditions(item, name_by_key, name_set):
    if isinstance(item.get("conditions"), str):
        return item["conditions"]  # raw passthrough
    if "all" in item:
        tree = ["and"] + [["or", ["or", _leaf(c, name_by_key, name_set)]] for c in item["all"]]
    elif "any" in item:
        tree = ["and", ["or"] + [["or", _leaf(c, name_by_key, name_set)] for c in item["any"]]]
    else:
        tree = ["and", ["or", ["or", _leaf(item, name_by_key, name_set)]]]
    return json.dumps(tree)


def cmd_audiences(args):
    token = load_token()
    pid = args.project

    attrs = api_list(f"/v2/attributes?project_id={pid}", token)
    name_by_key = {a["key"]: a["name"] for a in attrs}
    name_set = set(name_by_key.values())

    existing_names = {a.get("name") for a in api_list(f"/v2/audiences?project_id={pid}", token)}

    results = []
    for item in as_list(load_spec(args)):
        name = item["name"]
        conditions = _build_conditions(item, name_by_key, name_set)

        if args.dry_run:
            results.append({"name": name, "conditions": conditions, "status": "dry-run"})
            continue

        if name in existing_names:
            results.append({"name": name, "status": "exists"})
            continue

        body = {
            "project_id": int(pid),
            "name": name,
            "description": item.get("description", ""),
            "conditions": conditions,
        }
        # The condition already uses the attribute's display name (resolved
        # above), so this succeeds immediately — the "does not exist" error is a
        # wrong-field bug, not a delay. A short bounded retry is kept only as
        # insurance against a rare genuine transient; it never loops for minutes.
        status, resp = api("POST", "/v2/audiences", token, body, allow=(400, 409))
        attempts = 1
        while (status == 400 and isinstance(resp, dict)
               and "does not exist" in json.dumps(resp) and attempts < 3):
            time.sleep(3)
            status, resp = api("POST", "/v2/audiences", token, body, allow=(400, 409))
            attempts += 1
        if status == 400:
            die(f"audience {name!r} rejected: {resp}. The condition uses the "
                f"attribute display name; verify the attribute exists in project {pid}.")
        results.append({
            "name": name,
            "status": "created" if status in (200, 201) else "exists",
            "id": (resp or {}).get("id") if isinstance(resp, dict) else None,
            "conditions": conditions,
        })
    print(json.dumps({"audiences": results}, indent=2))


# --------------------------------------------------------------------------- #
# rules  (targeting rules that serve specific variations)
# --------------------------------------------------------------------------- #
def _rule_variations(rule):
    """Build the ruleset `variations` map (variation key -> {key, pct}) from a
    rule spec. Accepts `distribution` (key -> basis points), a single
    `variation` key, or a `variations` list split evenly. Sums to 10000."""
    dist = rule.get("distribution")
    if isinstance(dist, dict) and dist:
        return {vk: {"key": vk, "percentage_included": int(pct)} for vk, pct in dist.items()}
    keys = rule.get("variations")
    if isinstance(rule.get("variation"), str):
        keys = [rule["variation"]]
    if not keys:
        die(f"rule {rule.get('key')!r} needs `distribution`, `variation`, or `variations`.")
    n = len(keys)
    base = 10000 // n
    out = {}
    for i, vk in enumerate(keys):
        out[vk] = {"key": vk, "percentage_included": base if i < n - 1 else 10000 - base * (n - 1)}
    return out


def _rule_metrics(rule, event_id_by_key):
    """Build the ruleset `metrics` list. A/B rules require >=1 metric. Each spec
    entry is an event key string, or a dict with `event`/`event_id` plus optional
    aggregator/winning_direction/scope (sensible defaults supplied)."""
    out = []
    for m in rule.get("metrics") or []:
        if isinstance(m, str):
            m = {"event": m}
        eid = m.get("event_id")
        if m.get("event"):
            eid = event_id_by_key.get(m["event"])
            if eid is None:
                die(f"metric event {m['event']!r} not found in project. Create it "
                    f"first (events step). Known: {sorted(event_id_by_key)}")
        if eid is None:
            die(f"rule {rule.get('key')!r} metric needs `event` or `event_id`.")
        out.append({
            "event_id": int(eid),
            "aggregator": m.get("aggregator", "unique"),
            "winning_direction": m.get("winning_direction", "increasing"),
            "scope": m.get("scope", "visitor"),
        })
    return out


def _audience_conditions(rule, aud_id_by_name):
    """Resolve a rule's targeting into a ruleset audience_conditions value.
    Everyone -> [] (empty conditions); a named/id'd audience -> the nested
    ["and", ["or", {"audience_id": <int id>}]] the ruleset expects."""
    if rule.get("audience_conditions") is not None:
        return rule["audience_conditions"]  # raw passthrough
    aid = rule.get("audience_id")
    if rule.get("audience"):
        aid = aud_id_by_name.get(rule["audience"])
        if aid is None:
            die(f"no audience named {rule['audience']!r} in this project. "
                f"Create it first (audiences step). Known: {sorted(aud_id_by_name)}")
    if aid is None:
        return []
    # audience_id MUST be an integer here — passing it as a string trips a
    # misleading "audience_id values from other projects" validation error.
    return ["and", ["or", {"audience_id": int(aid)}]]


def cmd_rules(args):
    token = load_token()
    pid = args.project
    flag = args.flag
    env = args.env_key

    aud_id_by_name = {a.get("name"): a.get("id")
                      for a in api_list(f"/v2/audiences?project_id={pid}", token)}
    event_id_by_key = {e.get("key"): e.get("id")
                       for e in api_list(f"/v2/events?project_id={pid}", token)
                       if isinstance(e, dict)}

    # Current ruleset — so we append to (not clobber) any existing rules.
    _, ruleset = api("GET",
                     f"/flags/v1/projects/{pid}/flags/{flag}/environments/{env}/ruleset",
                     token, allow=(404,))
    existing_order = list(ruleset.get("rule_priorities") or []) if isinstance(ruleset, dict) else []
    existing_rules = set((ruleset.get("rules") or {}).keys()) if isinstance(ruleset, dict) else set()

    patch, results, spec_keys = [], [], []
    for rule in as_list(load_spec(args)):
        rkey = rule["key"]
        rule_obj = {
            "key": rkey,
            "name": rule.get("name", rkey),
            "type": rule.get("type", "a/b"),
            "enabled": rule.get("enabled", True),
            # Default to "running" so the rule serves live (a demo wants to see
            # variations immediately). The API also forbids demoting a running
            # rule back to draft on `replace`, so being explicit keeps re-runs safe.
            "status": rule.get("status", "running"),
            "percentage_included": int(rule.get("percentage_included", 10000)),
            "audience_conditions": _audience_conditions(rule, aud_id_by_name),
            "variations": _rule_variations(rule),
        }
        metrics = _rule_metrics(rule, event_id_by_key)
        if metrics:
            rule_obj["metrics"] = metrics
        # This API rejects `add` on an existing path, so use `replace` for a rule
        # that already exists (idempotent re-run) and `add` for a brand-new one.
        op = "replace" if rkey in existing_rules else "add"
        patch.append({"op": op, "path": f"/rules/{rkey}", "value": rule_obj})
        spec_keys.append(rkey)
        results.append({"key": rkey, "type": rule_obj["type"],
                        "variations": list(rule_obj["variations"]),
                        "metrics": [m["event_id"] for m in metrics]})

    # Spec order is the priority order (first = evaluated first); any pre-existing
    # rules not in this spec keep their relative order behind them.
    order = spec_keys + [k for k in existing_order if k not in spec_keys]
    patch.append({"op": "replace", "path": "/rule_priorities", "value": order})
    # A flag is disabled per-environment by default, and while disabled NONE of
    # its rules compile into the datafile (only the off rollout serves). Enabling
    # the environment is what makes the variations actually serve, so do it here
    # unless the caller wants the OFF-by-default live-toggle starting point.
    if not args.no_enable:
        patch.insert(0, {"op": "replace", "path": "/enabled", "value": True})
    status, resp = api("PATCH",
                       f"/flags/v1/projects/{pid}/flags/{flag}/environments/{env}/ruleset",
                       token, patch, allow=(400, 409))
    if status == 400:
        die(f"ruleset patch for {flag!r} rejected: {resp}")
    print(json.dumps({"flag": flag, "env": env, "status": status,
                      "rule_priorities": order, "rules": results}, indent=2))


# --------------------------------------------------------------------------- #
# enable-flag  (turn a flag ON at 100% via JSON Patch)
# --------------------------------------------------------------------------- #
def cmd_enable_flag(args):
    token = load_token()
    pid = args.project
    flag = args.flag
    env = args.env_key
    variation = args.variation
    pct = args.pct
    patch = [
        {"op": "add", "path": "/rules/everyone", "value": {
            "key": "everyone", "name": "Everyone", "type": "targeted_delivery",
            "audience_conditions": [], "percentage_included": pct, "enabled": True,
            "variations": {variation: {"key": variation, "percentage_included": 10000}},
        }},
        {"op": "replace", "path": "/rule_priorities", "value": ["everyone"]},
    ]
    status, resp = api(
        "PATCH",
        f"/flags/v1/projects/{pid}/flags/{flag}/environments/{env}/ruleset",
        token, patch, allow=(400, 409),
    )
    print(json.dumps({"flag": flag, "env": env, "status": status, "response": resp}, indent=2))


def main():
    p = argparse.ArgumentParser(prog="opti_config.py",
                                description="Optimizely project configuration runner")
    sub = p.add_subparsers(dest="cmd", required=True)

    pp = sub.add_parser("project", help="Create a project + return SDK keys / snippet")
    pp.add_argument("--name", required=True)
    pp.add_argument("--platform", choices=["custom", "web"], default="custom",
                    help="custom = Feature Experimentation, web = Web Experimentation")
    pp.add_argument("--description", default="")
    pp.set_defaults(func=cmd_project)

    def spec_args(sp):
        sp.add_argument("--project", required=True, help="Project ID")
        sp.add_argument("--spec", help="Path to a JSON spec file")
        sp.add_argument("--json", help="Inline JSON spec")

    pa = sub.add_parser("attributes", help="Bulk-create custom attributes")
    spec_args(pa)
    pa.set_defaults(func=cmd_attributes)

    pf = sub.add_parser("flags", help="Bulk-create feature flags")
    spec_args(pf)
    pf.set_defaults(func=cmd_flags)

    pe = sub.add_parser("events", help="Bulk-create custom events")
    spec_args(pe)
    pe.set_defaults(func=cmd_events)

    pau = sub.add_parser("audiences", help="Bulk-create audiences (key -> display name)")
    spec_args(pau)
    pau.add_argument("--dry-run", action="store_true",
                     help="Print the resolved conditions without creating anything")
    pau.set_defaults(func=cmd_audiences)

    pr = sub.add_parser("rules", help="Add targeting rules that serve specific variations")
    spec_args(pr)
    pr.add_argument("--flag", required=True, help="Flag key to add the rule(s) to")
    pr.add_argument("--env-key", default="development",
                    help="Environment key (default: development)")
    pr.add_argument("--no-enable", action="store_true",
                    help="Leave the flag OFF in this environment (rules won't serve "
                         "until toggled on in the UI). Default: enable so rules serve.")
    pr.set_defaults(func=cmd_rules)

    pen = sub.add_parser("enable-flag", help="Turn a flag ON at 100%% in an environment")
    pen.add_argument("--project", required=True)
    pen.add_argument("--flag", required=True)
    pen.add_argument("--env-key", default="development")
    pen.add_argument("--variation", default="on")
    pen.add_argument("--pct", type=int, default=10000, help="Basis points (10000 = 100%%)")
    pen.set_defaults(func=cmd_enable_flag)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
