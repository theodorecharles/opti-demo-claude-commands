# Optimizely Fake Data Generator

Populate an Optimizely experiment's Results page with realistic fake data. This command is a thin orchestrator around `~/.optimizely/fake_data.py` (installed by `install.sh`). The runner script handles the API calls, timestamp spreading, batched POSTs, and rate limiting. Claude's only job is to gather inputs from the user and invoke the script.

## Step 0: Verify the runner is installed

The runner lives at `~/.optimizely/fake_data.py`. If it's missing, tell the user:

> The fake-data runner isn't installed. From your `opti-demo-claude-commands` clone, run `./install.sh` (the installer downloads the runner alongside the command files).

Then stop. Do not try to bootstrap the script inline.

## Step 1: Ensure the API token exists

```bash
cat ~/.optimizely/api_token
```

If missing/empty, prompt the user for it and save:

```bash
mkdir -p ~/.optimizely && echo "<THEIR_TOKEN>" > ~/.optimizely/api_token && chmod 600 ~/.optimizely/api_token
```

## Step 2: Get the Results Page URL

If the user passed a URL as a command argument, use it. Otherwise ask:

> **Paste the Results page URL for the experiment** (e.g., `https://app.optimizely.com/v2/projects/.../results/.../experiments/...?baseline=...`)

## Step 3: Fetch experiment metadata via the runner

Run `info` and read the JSON output:

```bash
python3 ~/.optimizely/fake_data.py info "<URL>"
```

The output is a JSON object with these fields:

- `variations[]` — each `{variation_id, name}`
- `metrics[]` — each `{event_id, key}` (the runner skips ones without an event key)
- `experiment_name`, `experiment_status`
- `experiment_earliest`, `experiment_created` (ISO datetimes, for user-facing display)
- `experiment_start_ms` (epoch ms, computed by the runner from `earliest` → `created` → "1 hour ago")
- `account_id`, `project_id`, `campaign_id`, `experiment_id`

You won't pass `account_id` or `start_ms` back to the runner — it re-fetches them on `send`. The fields are there so you can show the user a friendly status line.

## Step 4: Ask the user

Use `AskUserQuestion`. Group **questions 1 and 2** into a single tool call (both questions in the array). Then conditionally ask **question 3**.

1. **Question: "How many visitors should we generate?"**
   - Options (label / description):
     - `5,000` / "Quick demo"
     - `10,000` / "Balanced sample"
     - `20,000` / "Larger sample"
     - `Custom` / "Enter a specific number"
   - If the user picks `Custom`, follow up with a plain-text prompt and capture the integer.

2. **Question: "Which variation should win?"**
   - One option per `variations[]` entry from Step 3. Label = `name` (truncate >25 chars). Description = `variation_id: <id>`.
   - Store the selected `variation_id` as `WINNER`.

3. **Question: "Which variation should lose?"**
   - **If the experiment has exactly 2 variations, skip this question** and auto-assign `LOSER` to the non-winner. Briefly tell the user (e.g., *"Only 2 variations — the loser defaults to <name>."*). `AskUserQuestion` requires ≥2 options per question, so a 1-option list would fail validation.
   - Otherwise, call `AskUserQuestion` a second time, with options = all variations *except* the winner. Store as `LOSER`.

## Step 5: Run the simulation

Briefly tell the user the spread window first (e.g., *"Spreading 5,000 visitors across the experiment window since `<experiment_earliest>` UTC."*). Then run **a single Bash command**:

```bash
python3 ~/.optimizely/fake_data.py send "<URL>" --visitors <N> --winner <WINNER_ID> --loser <LOSER_ID>
```

Omit `--loser <LOSER_ID>` if there was no loser question (single-variation experiments). The runner prints batch progress and a final `Done. Sent N visitors across M batch(es).` line.

## Step 6: Confirm

After the runner exits, tell the user:

> Sent **N** visitors across **M** batches to `logx.optimizely.com`. Results show up on the Results page within ~1–5 minutes depending on Optimizely's ingestion pipeline. Refresh the page to see numbers populate.

## Notes

- The runner spreads event timestamps uniformly across `[experiment_start, now]`. Optimizely clamps future timestamps to ingestion time, so spreading forward isn't useful.
- The runner waits 1 second between batches (configurable via `--batch-delay`).
- The runner sends only new visitors per batch — no cumulative re-send (which was a bug in the original reference tool).
- `campaign_activated.entity_id` is the campaign_id as a string; conversion event `entity_id` is the custom event ID as an integer. Revenue is in cents. Expect HTTP 204 on success.
