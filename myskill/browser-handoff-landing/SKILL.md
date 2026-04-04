---
name: browser-handoff-landing
description: Use when the user wants a landing page that pushes people out of an in-app browser like YouTube, Facebook, Instagram, or TikTok and then redirects to an external destination such as Messenger, WhatsApp, Telegram, a website, or an app deep link. Also use when the user wants this landing page deployed as a separate standalone Netlify site instead of inside an existing app domain.
---

# Browser Handoff Landing

Build very small landing pages whose job is:

1. receive traffic from an in-app browser
2. push the user into a real browser when possible
3. continue to an external target

## Default approach

- Prefer a separate standalone site when the existing app domain has a service worker, SPA fallback, app shell, or routing that can hijack the landing page.
- Keep the UI minimal unless the user explicitly asks for a richer design.
- For "simple page" requests, default to one short paragraph and one primary button.
- If the user wants YouTube viewers to "open in browser first", use a two-step flow:
  1. in-app browser state with `Open in Chrome or Safari`
  2. real browser state with `Open Messenger` or the final target CTA

## Decision rules

### Use a standalone site when any of these are true

- The existing domain already runs an app shell or single-page app.
- A service worker can control the route.
- The user says the landing page must be independent from the main app.
- The landing page should be reusable across multiple apps or campaigns.

### Use the existing app domain only when all of these are true

- The user explicitly wants it under that app.
- The route will not be swallowed by SPA fallback or service worker behavior.
- The target is simple and there is no reason to isolate it.

## Implementation workflow

1. Inspect the current site for SPA redirects, service workers, and route handling.
2. Decide whether the page belongs inside the app or as a standalone site.
3. Build the smallest page that satisfies the request.
4. Add browser handoff logic only if the user asked for forced escape from in-app browsers.
5. Verify the final target URL itself is healthy before blaming the page.
6. If Netlify is involved, prefer a separate site for a separate landing page.

## Browser handoff logic

Detect likely in-app browsers from the user agent:

- `YouTube`
- `FBAN`, `FBAV`, `FB_IAB`
- `Instagram`
- `Messenger`
- `TikTok`
- Android WebView markers like `wv`

### iPhone best-effort handoff

- Try `googlechrome://navigate?url=...`
- Then try `x-safari-https://...`
- Always show manual fallback steps because iOS may ignore the handoff attempt

### Android best-effort handoff

- Prefer a Chrome intent URL:

```text
intent://host/path?query#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fexample.com;end
```

- Keep manual fallback visible if the intent is blocked

### Real browser state

- Show a single clear CTA for the final target
- Auto-continue only if the user asked for that behavior
- Keep a retry button if the target app may fail to open

## Target URL verification

Before assuming the landing page is broken, verify the destination.

Useful checks:

```bash
curl -Ivs https://target.example
echo | openssl s_client -connect host:443 -servername host -showcerts
```

If the target shortlink has TLS or network filtering problems:

- explain clearly that the failure is outside the landing page
- propose an alternate official URL if one exists
- keep the page simple and update only the target link

## Netlify deployment pattern

For independent landing pages:

- create a separate folder for the microsite
- include a minimal `netlify.toml` inside that folder
- create or link a separate Netlify site
- deploy that folder, not the main app

If the user wants GitHub auto-deploy:

- either connect the standalone folder to its own Netlify site
- or add a GitHub Actions workflow that deploys that folder to a dedicated Netlify site

## Output expectations

When implementing this skill, deliver:

- the landing page files
- the hosting/deployment path
- the final public URL if deployed
- any blockers found in the target link itself

## Minimal page template

Start from [assets/minimal-handoff-page.html](assets/minimal-handoff-page.html) when the user wants a plain landing page. Replace placeholders with the real target URL and copy.
