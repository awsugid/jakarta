# Google Analytics Implementation Plan

## Overview
Add Google Analytics to the Astro project with the Google Tag ID configured via environment variable.

## Prerequisites
- Google Analytics Measurement ID (format: `G-XXXXXXXXXX`)

## Implementation Steps

### Step 1: Create `.env.example` file
Create a template file for environment variables (safe to commit):

```
# Google Analytics
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Step 2: Create `.env` file
Create the actual `.env` file with your real Google Analytics Measurement ID:

```
# Google Analytics
PUBLIC_GA_MEASUREMENT_ID=your-actual-ga-id
```

### Step 3: Verify `.gitignore`
Ensure `.env` is listed in `.gitignore` to prevent committing secrets.

### Step 4: Create GoogleAnalytics Component
Create `src/components/GoogleAnalytics.astro`:

```astro
---
const gaId = import.meta.env.PUBLIC_GA_MEASUREMENT_ID;
---

{gaId && (
  <>
    <script is:inline src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}></script>
    <script is:inline define:vars={{ gaId }}>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', gaId);
    </script>
  </>
)}
```

**Key points:**
- Uses `PUBLIC_` prefix for client-side access
- Conditionally renders only if `gaId` is set
- Uses `is:inline` directive for unprocessed scripts
- Uses `define:vars` to pass server variable to inline script

### Step 5: Update Layout.astro
Add the GoogleAnalytics component to the `<head>` section:

```astro
---
import Header from "../components/Header.astro";
import Footer from "../components/Footer.astro";
import GoogleAnalytics from "../components/GoogleAnalytics.astro";
import "../styles/global.css";
// ... rest of frontmatter
---

<!doctype html>
<html lang="en" class="dark">
  <head>
    <!-- existing meta tags -->
    <GoogleAnalytics />
    <title>{title}</title>
  </head>
  <!-- rest of body -->
</html>
```

## Files Summary

| File | Action |
|------|--------|
| `.env.example` | **Create** - Template for env vars |
| `.env` | **Create** - Actual env vars (gitignored) |
| `src/components/GoogleAnalytics.astro` | **Create** - GA script component |
| `src/layouts/Layout.astro` | **Modify** - Add GA component to head |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PUBLIC_GA_MEASUREMENT_ID` | Google Analytics Measurement ID (e.g., `G-XXXXXXXXXX`) | Yes |

## Deployment Notes
- Set `PUBLIC_GA_MEASUREMENT_ID` in your hosting platform's environment variables
- Common platforms: Vercel, Netlify, Cloudflare Pages all support env vars in their dashboards
- The `PUBLIC_` prefix ensures the variable is available at build time for static sites

## Verification
After implementation:
1. Run `bun dev` to start development server
2. Open browser DevTools > Network tab
3. Filter for "gtag" or "googletagmanager"
4. Verify the GA script loads with correct Measurement ID
