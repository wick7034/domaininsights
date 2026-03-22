<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DMPulse

This project uses a Vite frontend plus API endpoints that query Supabase.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY`
4. Start the local app with `npm run dev`

The local dev server runs `server.ts`, which serves the React app and exposes `/api/domains`, `/api/tlds`, and `/api/analytics`.

## Deploy

### Vercel

1. Import the repo into Vercel
2. Keep the build command as `npm run build`
3. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Project Settings -> Environment Variables

The `api/` folder provides Vercel serverless functions for the existing `/api/*` endpoints.
Do not include quote characters around the values in the Vercel dashboard.

### Netlify

1. Connect the repo in Netlify
2. Use the default build command `npm run build`
3. Use `dist` as the publish directory
4. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Site Settings -> Environment Variables

`netlify.toml` rewrites `/api/*` requests to Netlify Functions and keeps SPA routing working.
Do not include quote characters around the values in the Netlify dashboard.
