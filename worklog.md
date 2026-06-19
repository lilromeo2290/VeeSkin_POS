# VeeSkin POS — Shared Work Log

This is the **single shared work log** for the VeeSkin POS project.
All agents (and the automated git-push script) append to this file.
Never overwrite — only append new sections starting with `---`.

---

## Operating Protocol (READ FIRST)

### GitHub Repository
- **Repo**: https://github.com/lilromeo2290/VeeSkin_POS.git
- **Branch**: `main`
- **Token**: Stored in `/home/z/my-project/.env.github` (gitignored, never echo it)

### Commit & Push Policy — MANDATORY
**After every task that modifies source files, an agent MUST:**

1. Run `bash /home/z/my-project/scripts/git-push.sh` (auto commit message)
   - OR `bash /home/z/my-project/scripts/git-push.sh "descriptive message"` for a custom message
2. The script automatically:
   - Stages all non-ignored changes via `git add -A`
   - Generates a meaningful commit message with UTC timestamp
   - Pushes to `origin/main` using the GitHub token
   - Appends a new section to this worklog file
3. If the working tree is clean, the script still pulls to stay in sync.

### When to Push
- ✅ After completing a feature or fix
- ✅ After significant refactoring
- ✅ Before ending a session
- ✅ After updating the database schema (`prisma db push`)
- ✅ After reseeding demo data
- ❌ Do NOT push partial/broken work — finish the change first

### What Gets Committed (and what doesn't)
**Committed**:
- All `src/` source code (TypeScript, React components, API routes)
- `prisma/schema.prisma` (database schema)
- `scripts/git-push.sh` (the automation script itself)
- `worklog.md` (this file)
- Config: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, etc.
- `public/` assets (logo, images)

**Ignored** (via `.gitignore`):
- `node_modules/` — installed via `bun install`
- `.next/` — Next.js build output
- `.env*` — environment files (contain secrets)
- `db/*.db` — local SQLite database (regenerated from schema + seed)
- `*.log` — dev/server logs
- `/upload/`, `/*.png`, `/*.jpg` — local screenshots and uploads
- `/.zscripts/` — internal sandbox tooling

### Security Notes
- The GitHub token in `.env.github` is gitignored and never printed to logs.
- The git-push script scrubs the token from any captured output.
- Remote URL stored in git config does NOT contain the token; auth is passed per-push.
- **Rotate the token if you suspect it has been exposed.**

---

## Project Overview

**VeeSkin Essentials POS** is a point-of-sale web application for a luxury skincare & perfume boutique.
Built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma (SQLite), and Zustand.

### Architecture
- **Backend**: Next.js App Router API routes at `src/app/api/*`
- **Frontend**: React components in `src/components/pos/*`, single-page app at `src/app/page.tsx`
- **Database**: Prisma + SQLite, schema at `prisma/schema.prisma`, client at `src/lib/db.ts`
- **State**: Zustand cart store at `src/lib/cart-store.ts`
- **Branding**: VeeSkin Essentials — rose-gold (`#D4A574`), soft pink (`#E6A9B6`), gold (`#D4AF37`), warm dark sidebar

### Views
1. **Dashboard** — KPIs, sales chart, top products, category breakdown, low-stock alerts
2. **New Sale (POS Terminal)** — Product grid + cart + checkout flow
3. **Products** — CRUD for product catalog
4. **Orders** — Order history with detail view
5. **Inventory** — Stock levels and adjustments

---

## Work Log Entries

Entries below are appended automatically by `scripts/git-push.sh` and manually by agents.
Each entry starts with `---` and follows the template in the operating protocol.

---
Task ID: setup-001
Agent: main
Task: Initial GitHub integration setup

Work Log:
- Analyzed existing git repo state (branch main, 3 prior commits)
- Created `.env.github` with GH_TOKEN and GH_REPO (gitignored)
- Updated `.gitignore` to exclude local DB, screenshots, uploads, sandbox scripts
- Created `scripts/git-push.sh` automation script (executable)
- Created this `worklog.md` with operating protocol

Stage Summary:
- Repository target: https://github.com/lilromeo2290/VeeSkin_POS.git
- Branch: main
- Token securely stored in `.env.github`
- Automation script ready at `scripts/git-push.sh`
- Next step: run `git-push.sh` to make the first push of the VeeSkin POS codebase
