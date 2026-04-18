# Suggested Commands

## Node Version Prerequisite
Astro 6 requires Node >= 22.12.0. The shell's default `node` is often v21. Before any build/check command run:

```bash
nvm use 22
```

(or equivalent: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 22`)

## Package Manager
Bun is the canonical package manager. Both `bun.lock` and `package-lock.json` exist; prefer Bun.

## Everyday Commands (from project root)
```bash
bun install                          # install dependencies
bun dev                              # start dev server (http://localhost:4321)
bun run build                        # production build -> ./dist/
bun preview                          # preview production build
bun astro <...>                      # Astro CLI passthrough
bunx astro check                     # type-check + content validation (Node 22 required)
bunx tsc --noEmit                    # TypeScript-only check
npx shadcn@latest add <component>    # add shadcn/ui component -> src/components/ui/
```

## Cloudflare Pages Functions
API routes live in `functions/api/*.ts` (Cloudflare Pages convention).
- Local testing via `wrangler pages dev` if needed (wrangler artifacts in `.wrangler/`).
- Required env vars (see `.env.example`):
  - `BILLIONMAIL_API_URL`
  - `BILLIONMAIL_API_KEY`
  - `BILLIONMAIL_SPEAKERS_GROUP_ID`
  - `BILLIONMAIL_VOLUNTEERS_GROUP_ID`
  - `PUBLIC_GA_MEASUREMENT_ID`

## Verification Workflow Before Completing Changes
1. `nvm use 22`
2. `bun run build` (ensures Astro static pages still generate)
3. `bunx tsc --noEmit` (optional; note pre-existing `PagesFunction` TS errors in `functions/api/subscribe.ts` that are unrelated to app code)
