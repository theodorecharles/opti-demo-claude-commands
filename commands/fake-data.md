# Optimizely Fake Data Generator

Populate an Optimizely experiment's Results page with realistic-looking fake data. Given a Results page URL, this command fetches the experiment's variations and metrics via the REST API, asks how many visitors to simulate and which variation should win/lose, then POSTs batched decision + conversion events to `https://logx.optimizely.com/v1/events` with a **2-second pause between batches** to avoid overloading the API.

## Step 0: Load API Token

Read the API token from `~/.optimizely/api_token`:

```bash
cat ~/.optimizely/api_token
```

- If the file exists and contains a token, use it as `TOKEN` for all subsequent API calls.
- If missing/empty, ask the user: **"Please paste your Optimizely API token (e.g., `2:abc123...`). You can find this in your Optimizely account under Settings > API Access."** Then save it:

  ```bash
  mkdir -p ~/.optimizely && echo "<THEIR_TOKEN>" > ~/.optimizely/api_token && chmod 600 ~/.optimizely/api_token
  ```

## Step 1: Get the Results Page URL

If the user passed a URL as a command argument, use it. Otherwise ask:

> **Paste the Results page URL for the experiment** (e.g., `https://app.optimizely.com/v2/projects/5562178971893760/results/9300002367830/experiments/9300003116092?baseline=1708354`)

Parse these three integers from the path:
- `PROJECT_ID` — the number after `/projects/`
- `CAMPAIGN_ID` — the number after `/results/`
- `EXPERIMENT_ID` — the number after `/experiments/`

## Step 2: Fetch project, variations, and metrics

```bash
# account_id for the events payload
curl -s "https://api.optimizely.com/v2/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"
# → save .account_id as ACCOUNT_ID

# variations[] and metrics[]
curl -s "https://api.optimizely.com/v2/experiments/$EXPERIMENT_ID" \
  -H "Authorization: Bearer $TOKEN"
# → variations[]: each has {variation_id, name}
# → metrics[]:    each has {event_id, aggregator, scope, field, winning_direction}
```

For every metric that has an `event_id`, resolve its event key:

```bash
curl -s "https://api.optimizely.com/v2/events/$EVENT_ID" \
  -H "Authorization: Bearer $TOKEN"
# → .key is the event's string key (e.g., "add_to_cart")
```

Skip metrics where `event_id` is null or the event lookup returns 404 (overall-revenue / page-based metrics without a custom event backer). You now have:

- `ACCOUNT_ID`
- `VARIATIONS`: `[{variation_id, name}, ...]`
- `METRICS`: `[{event_id, key}, ...]`

## Step 3: Ask the user

Use the `AskUserQuestion` tool to present three multiple-choice questions. Ask them in a single tool call (pass all three as an array) so the user answers in one shot.

1. **Question: "How many visitors should we generate?"**
   - Options (header / description):
     - `5,000` / "Quick demo"
     - `10,000` / "Balanced sample"
     - `20,000` / "Larger sample"
     - `Custom` / "Enter a specific number"
   - If the user picks `Custom`, follow up with a plain-text prompt: *"How many visitors? (integer)"* and use their reply as `FD_VISITORS`.

2. **Question: "Which variation should win?"**
   - Options: one per variation fetched in Step 2. Header = variation name (truncate/shorten if >25 chars). Description = `variation_id: <id>`.
   - Store the selected variation's `variation_id` as `FD_WINNER_VARIATION`.

3. **Question: "Which variation should lose?"**
   - Same options as (2), but prefer calling `AskUserQuestion` a second time AFTER the winner is known so you can omit the winner from the choices.
   - Store as `FD_LOSER_VARIATION`.

Remaining variations (neither winner nor loser) get a neutral conversion rate.

## Step 4: Write the batch-sender script

Write this Python script to `/tmp/opti_fake_data.py`:

```python
#!/usr/bin/env python3
"""Send fake decision + conversion events to Optimizely.

All config is passed via env vars (see /fake-data command):
  FD_ACCOUNT_ID, FD_PROJECT_ID, FD_CAMPAIGN_ID, FD_EXPERIMENT_ID
  FD_VARIATIONS_JSON    [{"variation_id": "...", "name": "..."}, ...]
  FD_METRICS_JSON       [{"event_id": 123, "key": "..."}, ...]
  FD_VISITORS           total visitors to simulate (int)
  FD_WINNER_VARIATION   variation_id
  FD_LOSER_VARIATION    variation_id
  FD_BATCH_SIZE         default 1000
  FD_BATCH_DELAY        default 2.0 (seconds)
"""
import json, os, sys, time, uuid, random, urllib.request, urllib.error

ACCOUNT_ID     = os.environ["FD_ACCOUNT_ID"]
PROJECT_ID     = os.environ["FD_PROJECT_ID"]
CAMPAIGN_ID    = os.environ["FD_CAMPAIGN_ID"]
EXPERIMENT_ID  = os.environ["FD_EXPERIMENT_ID"]
VARIATIONS     = json.loads(os.environ["FD_VARIATIONS_JSON"])
METRICS        = json.loads(os.environ["FD_METRICS_JSON"])
TOTAL          = int(os.environ["FD_VISITORS"])
WINNER         = str(os.environ.get("FD_WINNER_VARIATION", ""))
LOSER          = str(os.environ.get("FD_LOSER_VARIATION", ""))
BATCH_SIZE     = int(os.environ.get("FD_BATCH_SIZE", "1000"))
BATCH_DELAY    = float(os.environ.get("FD_BATCH_DELAY", "2.0"))

def conversion_rate(variation_id: str) -> float:
    if variation_id == WINNER: return 0.15
    if variation_id == LOSER:  return 0.08
    return 0.11

BROWSERS  = ["gc", "ff", "safari", "ie"]
DEVICES   = ["iphone", "ipad", "desktop"]
SOURCES   = ["search", "direct", "campaign", "social"]
CAMPAIGNS = ["winter campaign", "frequent visitors", "discount", "retargeting"]

variation_ids = [str(v["variation_id"]) for v in VARIATIONS]

def build_visitor(now_ms: int) -> dict:
    variation_id = random.choice(variation_ids)
    events = [{
        "entity_id": str(CAMPAIGN_ID),
        "uuid": str(uuid.uuid4()).upper(),
        "key": "campaign_activated",
        "timestamp": now_ms,
    }]
    rate = conversion_rate(variation_id)
    for m in METRICS:
        if random.random() < rate:
            events.append({
                "entity_id": int(m["event_id"]),
                "uuid": str(uuid.uuid4()).upper(),
                "key": m["key"],
                "timestamp": now_ms,
                "revenue": random.randint(1000, 20000),   # cents
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
                "campaign_id":          str(CAMPAIGN_ID),
                "experiment_id":        str(EXPERIMENT_ID),
                "variation_id":         variation_id,
                "is_campaign_holdback": False,
            }],
            "events": events,
        }],
    }

def send(visitors: list) -> int:
    body = json.dumps({
        "account_id":     str(ACCOUNT_ID),
        "project_id":     str(PROJECT_ID),
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

total_batches = (TOTAL + BATCH_SIZE - 1) // BATCH_SIZE
sent = 0
for b in range(total_batches):
    count = min(BATCH_SIZE, TOTAL - sent)
    now_ms = int(time.time() * 1000)
    batch = [build_visitor(now_ms + i) for i in range(count)]
    try:
        status = send(batch)
    except urllib.error.HTTPError as e:
        print(f"[{b+1}/{total_batches}] HTTP {e.code}: {e.read()[:500].decode(errors='replace')}", flush=True)
        sys.exit(1)
    except Exception as e:
        print(f"[{b+1}/{total_batches}] ERROR: {e}", flush=True)
        sys.exit(1)
    sent += count
    print(f"[{b+1}/{total_batches}] sent {count} visitors ({sent}/{TOTAL}) → HTTP {status}", flush=True)
    if b + 1 < total_batches:
        time.sleep(BATCH_DELAY)

print(f"Done. Sent {sent} visitors across {total_batches} batch(es).")
```

## Step 5: Run the script

Populate the env vars and run:

```bash
export FD_ACCOUNT_ID="<ACCOUNT_ID>"
export FD_PROJECT_ID="<PROJECT_ID>"
export FD_CAMPAIGN_ID="<CAMPAIGN_ID>"
export FD_EXPERIMENT_ID="<EXPERIMENT_ID>"
export FD_VARIATIONS_JSON='[{"variation_id":"1708354","name":"Control"},{"variation_id":"1708374","name":"Variation 1"}]'
export FD_METRICS_JSON='[{"event_id":5450779331395584,"key":"list_interact"},{"event_id":6254372410097664,"key":"broadway_direct_redirect"}]'
export FD_VISITORS=5000
export FD_WINNER_VARIATION="1708374"
export FD_LOSER_VARIATION="1708354"
python3 /tmp/opti_fake_data.py
```

The script prints progress per batch. With 5000 visitors at 1000/batch, expect 5 batches over ~8 seconds (4 × 2s waits between them).

## Step 6: Confirm

After the script finishes, tell the user:

> Sent **N** visitors across **M** batches to `logx.optimizely.com`. Results show up on the Results page within ~1–5 minutes depending on Optimizely's ingestion pipeline. Refresh the page (the one you pasted) to see numbers populate.

## Issues found in the reference tool (from HAR analysis)

The existing fake-data tool (`client_name: ricky/fakedata.pwned v1.0.0`) has two bugs this command avoids:

1. **Cumulative re-send.** Each subsequent batch re-POSTs every event from prior batches *plus* new ones. In the captured HAR, batch 0 had 2101 event UUIDs, batch 1 had 4175 (all 2101 from batch 0 + 2074 new), batch 2 had 6273, batch 3 had 8405 — 20,954 total events sent for only 8,405 unique. About 2.5× data amplification and duplicate impressions.
2. **No rate limiting.** Batches fired ~20–30 ms apart (and each was >800 KB). At high visitor counts this will trip Optimizely's ingestion rate limits or starve the connection.

This command sends only the new visitors in each batch and waits 2 seconds between batches.

## Payload reference (one batch POST body)

```json
{
  "account_id": "<ACCOUNT_ID>",
  "project_id": "<PROJECT_ID>",
  "anonymize_ip": true,
  "client_name": "opti-demo/fake-data",
  "client_version": "1.0.0",
  "visitors": [
    {
      "visitor_id": "visitor_<hex>",
      "session_id": "session_<hex>",
      "attributes": [
        {"entity_id": 100, "type": "browserId",   "value": "gc"},
        {"entity_id": 200, "type": "campaign",    "value": "winter campaign"},
        {"entity_id": 300, "type": "device",      "value": "iphone"},
        {"entity_id": 600, "type": "source_type", "value": "search"}
      ],
      "snapshots": [
        {
          "decisions": [
            {
              "campaign_id": "<CAMPAIGN_ID>",
              "experiment_id": "<EXPERIMENT_ID>",
              "variation_id": "<chosen variation_id>",
              "is_campaign_holdback": false
            }
          ],
          "events": [
            {
              "entity_id": "<CAMPAIGN_ID>",
              "uuid": "<uuid4>",
              "key": "campaign_activated",
              "timestamp": 1776695909790
            },
            {
              "entity_id": 5450779331395584,
              "uuid": "<uuid4>",
              "key": "<metric_event_key>",
              "timestamp": 1776695909790,
              "revenue": 1500,
              "value": 15.00,
              "tags": {"$opt_event_properties": {}}
            }
          ]
        }
      ]
    }
  ]
}
```

Key details to preserve: `campaign_activated.entity_id` is the **campaign_id as a string**, while conversion event `entity_id` is the custom event ID as an **integer**. `revenue` is in **cents**. Expect HTTP 204 on success.
