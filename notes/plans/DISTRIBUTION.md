# LoveDate Distribution Guide

## 0) Beta safety bootstrap (Supabase)
1. Open Supabase SQL Editor.
2. Run [`scripts/supabase_beta_setup.sql`](scripts/supabase_beta_setup.sql).
3. Set app env vars (at minimum):
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_REQUIRE_INVITE_CODE=true
VITE_ALLOW_GUEST_LOGIN=false
VITE_BETA_ALLOWED_EMAIL_DOMAINS=yourdomain.com
```
4. Restart app/build after env changes.

## Web release package (zip)
1. Run:
```bash
npm run release
```
2. Output is created in `releases/` as:
- a versioned folder
- a versioned `.zip`

## Production web deploy (Vercel or Netlify)
- Vercel: `vercel --prod` (or deploy from Vercel UI)
- Netlify: connect repo or run `netlify deploy --prod`

Notes:
- `vercel.json` and `netlify.toml` are configured for SPA rewrite to `index.html`.
- Add all `VITE_*` environment variables in your hosting dashboard.

## Windows desktop installer (.exe)
1. Run:
```bash
npm run dist:desktop
```
2. Output is created in `desktop-dist/`:
- `LoveDate-Setup-<version>.exe` (installer)
- `win-unpacked/` (portable unpacked app)

## Optional: portable desktop build
```bash
npm run dist:desktop:portable
```

## Recommended: both desktop artifacts in one command
```bash
npm run dist:desktop:all
```

## Notes
- If SmartScreen warns on first run, choose "More info" -> "Run anyway" for local unsigned builds.
- For production public distribution, code-signing is recommended.
- To customize installer icon, add an `.ico` file and set `build.win.icon` in `package.json`.
