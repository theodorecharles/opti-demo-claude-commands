---
description: Build an Optimizely Web Experimentation demo site end-to-end — project, snippet, and a production-quality demo site.
model: claude-opus-4-8
effort: xhigh
---

# Optimizely Web Experimentation Demo Builder

You are building an Optimizely Web Experimentation demo site for a prospect. The user is a Solution Engineer at Optimizely. This skill automates: creating the Optimizely Web project, getting the JS snippet, building a demo website, and inserting the snippet.

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

Also make sure the project-config runner is present. If
`~/.optimizely/opti_config.py` is missing, download it:

```bash
[ -f ~/.optimizely/opti_config.py ] || (mkdir -p ~/.optimizely && curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/scripts/opti_config.py" -o ~/.optimizely/opti_config.py && chmod +x ~/.optimizely/opti_config.py)
```

The runner reads the token from `~/.optimizely/api_token` itself.

## Arguments

The user will provide:
- **Prospect name** and context (e.g., "Walgreens")
- **What kind of site**: landing page, e-commerce, SaaS dashboard, etc.
- **Any screenshots or design references** for the UI
- **Experiments they want to demo** (optional — these are usually built in the Optimizely Visual Editor, not in code)

If the prospect name is missing, ask before proceeding.

## Optimizely configuration (via `opti_config.py`)

The Optimizely-side setup runs through the project-config runner
(`~/.optimizely/opti_config.py`), which reads the token from
`~/.optimizely/api_token` and prints JSON. Bulk subcommands skip entities that
already exist, so re-runs are safe.

## Step 1: Create the Optimizely Web Project

```bash
python3 ~/.optimizely/opti_config.py project --name "<PROSPECT_NAME>" --platform web
```

From the JSON output, save `project_id` → **PROJECT_ID**. The output also
includes `snippet_url` and a ready-to-paste `snippet_tag`:

```html
<script src="https://cdn.optimizely.com/js/<PROJECT_ID>.js"></script>
```

## Step 2: Create custom events (if needed)

Only create events if the user specifies them. Web Experimentation tracks clicks
and pageviews via the Visual Editor, but custom events are useful for tracking
conversions.

```bash
python3 ~/.optimizely/opti_config.py events --project <PROJECT_ID> --json '[
  {"key": "signup_completed", "name": "Signup Completed"}
]'
```

## Step 3: Create audiences (if needed)

Most WX audiences are built in the Visual Editor from built-in dimensions
(device, geo, cookies, URL). If you need **custom-attribute** audiences, first
create the attributes, then the audiences — referencing each attribute by its
**key** (the runner resolves it to the display name the audiences API validates
against, so there's no "attribute does not exist" error):

```bash
python3 ~/.optimizely/opti_config.py attributes --project <PROJECT_ID> --json '[
  {"key": "plan_tier", "name": "Plan Tier"}
]'
python3 ~/.optimizely/opti_config.py audiences --project <PROJECT_ID> --json '[
  {"name": "Premium Plan", "attribute": "plan_tier", "value": "premium"}
]'
```

## Step 4: Build the Demo Website

Build a static or simple web app that looks like the prospect's real site. Key guidelines:

### Tech stack
- Default to a simple static site (HTML/CSS/JS) served with a local dev server
- Use Next.js or Vite only if the user requests a framework
- For static sites, use `npx serve .` or `python3 -m http.server` to serve locally

### Optimizely Slides deck (only if this demo is a React/Next app)
The interactive product deck is a **React/Next** package, so it can only be built
in when the demo itself is a Next.js app (i.e. the user asked for a framework
above). In that case, fold it into the build the same way the `/fx-demo` Web
track does — copy `~/.optimizely/slides/package` in (`optimizely-slides/` under
the src root, `app/slides` under the app dir, assets into `public/`), add
`@import "../optimizely-slides/slides.css";` after `@import "tailwindcss";`, and
tailor `slides.config.ts` (set `wxSnippetId` to this project's snippet/PROJECT_ID
and `brand` to the prospect). For a **default static-HTML** WX site there's no
React host, so skip the deck — don't try to bolt it onto a plain snippet site.

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
