#!/usr/bin/env python3
"""Optimizely fake-data generator.

Two subcommands:

  info <results-url>
      Fetch the experiment's variations, metrics, account_id, and start
      time (parsed from the experiment's `earliest`, falling back to
      `created`). Prints a JSON object Claude can read to drive the
      AskUserQuestion prompts.

  send <results-url> --visitors N --winner VARIATION_ID [--loser VARIATION_ID]
      Generate N fake visitors and POST them in batches to
      https://logx.optimizely.com/v1/events. Timestamps are drawn
      uniformly from [experiment_start, now]. Optimizely clamps future
      timestamps to ingestion time, so we never spread forward.

Reads the API token from $OPTIMIZELY_API_TOKEN or ~/.optimizely/api_token.
"""
import argparse
import datetime
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.request
import uuid

TOKEN_FILE = os.path.expanduser("~/.optimizely/api_token")
BROWSERS  = ["gc", "ff", "safari", "ie"]
DEVICES   = ["iphone", "ipad", "desktop"]
SOURCES   = ["search", "direct", "campaign", "social"]
CAMPAIGNS = ["winter campaign", "frequent visitors", "discount", "retargeting"]


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


def parse_url(url):
    m = re.search(r"/projects/(\d+)/results/(\d+)/experiments/(\d+)", url)
    if not m:
        die(f"could not parse Results URL: {url!r}")
    return {
        "project_id": m.group(1),
        "campaign_id": m.group(2),
        "experiment_id": m.group(3),
    }


def api_get(path, token, allow_404=False):
    req = urllib.request.Request(
        f"https://api.optimizely.com/v2{path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if allow_404 and e.code == 404:
            return None
        body = e.read()[:300].decode(errors="replace")
        die(f"GET /v2{path} → HTTP {e.code}: {body}")


def iso_to_ms(iso):
    if not iso:
        return None
    try:
        dt = datetime.datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return int(dt.timestamp() * 1000)
    except Exception:
        return None


def fetch_metadata(url, token):
    ids = parse_url(url)
    project = api_get(f"/projects/{ids['project_id']}", token)
    experiment = api_get(f"/experiments/{ids['experiment_id']}", token)

    variations = [
        {"variation_id": str(v["variation_id"]), "name": v.get("name") or ""}
        for v in experiment.get("variations", [])
    ]

    metrics = []
    for m in experiment.get("metrics", []):
        eid = m.get("event_id")
        if not eid:
            continue
        ev = api_get(f"/events/{eid}", token, allow_404=True)
        if ev and ev.get("key"):
            metrics.append({"event_id": int(eid), "key": ev["key"]})

    now_ms = int(time.time() * 1000)
    start_ms = iso_to_ms(experiment.get("earliest")) or iso_to_ms(experiment.get("created"))
    if not start_ms or start_ms >= now_ms:
        start_ms = now_ms - 60 * 60 * 1000  # fall back to 1 hour ago

    return {
        "project_id": ids["project_id"],
        "campaign_id": ids["campaign_id"],
        "experiment_id": ids["experiment_id"],
        "account_id": project.get("account_id"),
        "experiment_name": experiment.get("name"),
        "experiment_status": experiment.get("status"),
        "experiment_earliest": experiment.get("earliest"),
        "experiment_created": experiment.get("created"),
        "experiment_start_ms": start_ms,
        "now_ms": now_ms,
        "variations": variations,
        "metrics": metrics,
    }


def cmd_info(args):
    token = load_token()
    print(json.dumps(fetch_metadata(args.url, token), indent=2))


def build_visitor(meta, variation_id, conv_rate, timestamp_ms):
    events = [{
        "entity_id": str(meta["campaign_id"]),
        "uuid": str(uuid.uuid4()).upper(),
        "key": "campaign_activated",
        "timestamp": timestamp_ms,
    }]
    for m in meta["metrics"]:
        if random.random() < conv_rate:
            events.append({
                "entity_id": str(m["event_id"]),
                "uuid": str(uuid.uuid4()).upper(),
                "key": m["key"],
                "timestamp": timestamp_ms,
                "revenue": random.randint(1000, 20000),
                "value": round(random.uniform(10, 200), 2),
                "tags": {"$opt_event_properties": {}},
            })
    return {
        "visitor_id": f"visitor_{uuid.uuid4().hex}",
        "session_id": f"session_{uuid.uuid4().hex}",
        "attributes": [
            {"entity_id": 100, "type": "browserId",   "value": random.choice(BROWSERS)},
            {"entity_id": 200, "type": "campaign",    "value": random.choice(CAMPAIGNS)},
            {"entity_id": 300, "type": "device",      "value": random.choice(DEVICES)},
            {"entity_id": 600, "type": "source_type", "value": random.choice(SOURCES)},
        ],
        "snapshots": [{
            "decisions": [{
                "campaign_id":          str(meta["campaign_id"]),
                "experiment_id":        str(meta["experiment_id"]),
                "variation_id":         variation_id,
                "is_campaign_holdback": False,
            }],
            "events": events,
        }],
    }


def send_batch(visitors, meta):
    body = json.dumps({
        "account_id":     str(meta["account_id"]),
        "project_id":     str(meta["project_id"]),
        "anonymize_ip":   True,
        "client_name":    "opti-demo/fake-data",
        "client_version": "1.0.0",
        "visitors":       visitors,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://logx.optimizely.com/v1/events",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.status


def cmd_send(args):
    token = load_token()
    meta = fetch_metadata(args.url, token)

    winner = str(args.winner)
    loser  = str(args.loser) if args.loser else ""
    var_ids = [v["variation_id"] for v in meta["variations"]]
    if winner not in var_ids:
        die(f"--winner {winner!r} not in variations {var_ids}")
    if loser and loser not in var_ids:
        die(f"--loser {loser!r} not in variations {var_ids}")

    def conv_rate(vid):
        if vid == winner: return 0.15
        if vid == loser:  return 0.08
        return 0.11

    start_ms = meta["experiment_start_ms"]
    end_ms   = int(time.time() * 1000)
    total    = int(args.visitors)
    batch_size  = int(args.batch_size)
    batch_delay = float(args.batch_delay)

    total_batches = (total + batch_size - 1) // batch_size
    sent = 0
    for b in range(total_batches):
        count = min(batch_size, total - sent)
        batch = []
        for _ in range(count):
            vid = random.choice(var_ids)
            ts  = random.randint(start_ms, end_ms)
            batch.append(build_visitor(meta, vid, conv_rate(vid), ts))
        try:
            status = send_batch(batch, meta)
        except urllib.error.HTTPError as e:
            body = e.read()[:300].decode(errors="replace")
            die(f"batch {b+1}/{total_batches} → HTTP {e.code}: {body}")
        sent += count
        print(f"[{b+1}/{total_batches}] sent {count} visitors ({sent}/{total}) → HTTP {status}", flush=True)
        if b + 1 < total_batches:
            time.sleep(batch_delay)

    print(f"Done. Sent {sent} visitors across {total_batches} batch(es).")


def main():
    p = argparse.ArgumentParser(prog="fake_data.py", description="Optimizely fake-data generator")
    sub = p.add_subparsers(dest="cmd", required=True)

    pi = sub.add_parser("info", help="Print experiment metadata as JSON")
    pi.add_argument("url", help="Optimizely Results page URL")
    pi.set_defaults(func=cmd_info)

    ps = sub.add_parser("send", help="Generate and POST fake visitor events")
    ps.add_argument("url", help="Optimizely Results page URL")
    ps.add_argument("--visitors", type=int, required=True)
    ps.add_argument("--winner",   required=True, help="Winning variation_id")
    ps.add_argument("--loser",    default="",    help="Losing variation_id (optional)")
    ps.add_argument("--batch-size",  type=int,   default=1000)
    ps.add_argument("--batch-delay", type=float, default=1.0, help="Seconds between batches")
    ps.set_defaults(func=cmd_send)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
