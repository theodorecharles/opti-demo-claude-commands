# Optimizely Web Experimentation Demo Builder

You are building an Optimizely Web Experimentation demo site for a prospect. The user is a Solution Engineer at Optimizely. This skill automates: creating the Optimizely Web project, getting the JS snippet, building a demo website, and inserting the snippet.

## Update Check

Before doing anything else, check if a newer version of this command is available. Download the remote version to a temp file and compare it to the local copy:

```bash
curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/commands/wx-demo.md" -o /tmp/wx-demo-latest.md 2>/dev/null && diff -q ~/.claude/commands/wx-demo.md /tmp/wx-demo-latest.md > /dev/null 2>&1; echo $?
```

- If the diff exits with `0`, the command is up to date. Proceed silently.
- If the diff exits with `1`, an update is available. Tell the user: **"An update is available for the demo commands. Run `/update-demo-commands` to get the latest version."** Then continue with the current version.
- If the curl fails, silently continue.

## Step 0: Load API Token

Read the API token from `~/.optimizely/api_token`:

```bash
cat ~/.optimizely/api_token
```

- If the file exists and contains a token, use that token for all API calls in this workflow. Store it as `TOKEN` for use in all subsequent steps.
- If the file does not exist or is empty, ask the user: **"Please paste your Optimizely API token (e.g., `2:abc123...`). You can find this in your Optimizely account under Settings > API Access."**
  - Once they provide it, save it for future use:
    ```bash
    mkdir -p ~/.optimizely && echo "<THEIR_TOKEN>" > ~/.optimizely/api_token && chmod 600 ~/.optimizely/api_token
    ```
  - Then proceed with that token.

## Arguments

The user will provide:
- **Prospect name** and context (e.g., "Walgreens")
- **What kind of site**: landing page, e-commerce, SaaS dashboard, etc.
- **Any screenshots or design references** for the UI
- **Experiments they want to demo** (optional — these are usually built in the Optimizely Visual Editor, not in code)

If the prospect name is missing, ask before proceeding.

## Optimizely API Configuration

- **Base URL**: `https://api.optimizely.com`
- **Auth Header**: `Authorization: Bearer <TOKEN>` (where `<TOKEN>` is loaded from Step 0)

## Step 1: Create the Optimizely Web Project

```bash
curl -s -X POST "https://api.optimizely.com/v2/projects" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "<PROSPECT_NAME>", "platform": "web"}'
```

Save the `id` from the response as `PROJECT_ID`.

The JavaScript snippet URL is: `https://cdn.optimizely.com/js/<PROJECT_ID>.js`

The `<script>` tag to insert is:
```html
<script src="https://cdn.optimizely.com/js/<PROJECT_ID>.js"></script>
```

## Step 2: Create Custom Events (if needed)

Only create events if the user specifies them. Web Experimentation tracks clicks and pageviews via the Visual Editor, but custom events can be useful for tracking conversions.

```bash
curl -s -X POST "https://api.optimizely.com/v2/projects/<PROJECT_ID>/custom_events" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"key": "<event_key>", "name": "<Event Name>", "description": "<description>", "event_type": "custom"}'
```

## Step 3: Create Audiences (if needed)

```bash
curl -s -X POST "https://api.optimizely.com/v2/audiences" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": <PROJECT_ID>,
    "name": "<Audience Name>",
    "description": "<description>",
    "conditions": "[\"and\", [\"or\", [\"or\", {\"match_type\": \"exact\", \"name\": \"<attr_key>\", \"type\": \"custom_attribute\", \"value\": <value>}]]]"
  }'
```

## Step 4: Build the Demo Website

Build a static or simple web app that looks like the prospect's real site. Key guidelines:

### Tech stack
- Default to a simple static site (HTML/CSS/JS) served with a local dev server
- Use Next.js or Vite only if the user requests a framework
- For static sites, use `npx serve .` or `python3 -m http.server` to serve locally

### Optimizely snippet placement
- Insert the Optimizely `<script>` tag as the **very first script** in the `<head>` tag, before any other scripts or stylesheets
- This ensures Optimizely loads synchronously and can modify the page before it renders (preventing flicker)

```html
<!DOCTYPE html>
<html>
<head>
    <!-- Optimizely Web Experimentation — MUST be first script in head -->
    <script src="https://cdn.optimizely.com/js/<PROJECT_ID>.js"></script>

    <!-- Other head content follows -->
    <meta charset="UTF-8">
    <title>...</title>
    ...
</head>
```

### Custom event tracking in code
If the user needs custom event tracking (beyond what the Visual Editor handles):

```javascript
// Track a custom event
window.optimizely = window.optimizely || [];
window.optimizely.push({
  type: "event",
  eventName: "<event_key>"
});

// Track with tags
window.optimizely.push({
  type: "event",
  eventName: "<event_key>",
  tags: {
    revenue: 1999, // in cents
    value: 19.99
  }
});
```

### Design principles
- Match the prospect's brand colors, fonts, and visual style as closely as possible
- Use real-looking content (product names, prices, descriptions)
- Download stock photos from Unsplash for product/hero imagery
- Make the site look production-quality — this IS the demo
- Include interactive elements that the SE can target with the Visual Editor (buttons, hero banners, CTAs, product cards, navigation)
- Use semantic HTML with descriptive class names and IDs — this makes it easier to target elements in the Visual Editor

### Page structure tips for good Visual Editor demos
- Give key elements clear IDs: `id="hero-banner"`, `id="cta-button"`, `id="pricing-section"`
- Use descriptive classes: `class="product-card"`, `class="nav-link"`, `class="promo-banner"`
- Include multiple similar elements (product grids, feature lists) so the SE can demo reordering/hiding
- Include a hero section with headline + subhead + CTA — classic A/B test target
- Include a pricing section or product grid — great for multivariate tests

## Step 5: Serve and Verify

```bash
# For static sites
npx serve . -l 3000

# Or
python3 -m http.server 3000
```

Open the site in a browser, then verify the Optimizely snippet is loading by checking the browser console:
```javascript
// Should return the Optimizely client object
window.optimizely
```

Take a screenshot if possible and show it to the user.

## Output

After completing all steps, summarize:
1. Optimizely Web project name and ID
2. Snippet URL and script tag
3. Any custom events created
4. Any audiences created
5. Demo site location and how to serve it
6. Remind the user they can now go to app.optimizely.com to create experiments using the Visual Editor against the running demo site
