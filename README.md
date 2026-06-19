# VeeSkin Essentials POS

A point-of-sale web application for the **VeeSkin Essentials** luxury skincare & perfume boutique. Built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma (SQLite), and Zustand.

## Features

- **Dashboard** — KPI cards, 7-day sales chart, top products, category breakdown, low-stock alerts
- **New Sale (POS Terminal)** — Product grid with category filters, tap-to-add cart, discounts, tax, multi-method checkout (Cash/Card/Digital), printable receipts
- **Products** — Full CRUD with search, category filter, margin calculations
- **Orders** — Searchable order history with detailed receipt view
- **Inventory** — Stock stats, quick adjustments, low-stock threshold management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite |
| State | Zustand (cart) + TanStack Query (server) |
| Charts | Recharts |
| Icons | Lucide React |

## Brand Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Rose Gold | `#D4A574` | Primary accent, buttons, totals |
| Soft Pink | `#E6A9B6` | Secondary accent, pink category |
| Gold | `#D4AF37` | Highlight, gold category |
| Deep Rose | `#C77B8E` | Masks category, dark accents |
| Warm Dark | `#1a1410` → `#2a1f18` | Sidebar gradient |

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A GitHub Personal Access Token (for automated push script, optional)

### Installation

```bash
# Install dependencies
bun install

# Copy env template and configure
cp .env.example .env

# Push database schema
bun run db:push

# Start dev server
bun run dev
```

Open `http://localhost:3000` and click **"Load Demo Catalog"** to seed 6 categories, 35 products, and 25 sample orders.

### Environment Files

| File | Purpose | Committed? |
|------|---------|------------|
| `.env` | `DATABASE_URL` | No (gitignored) |
| `.env.example` | Template for `.env` | Yes |
| `.env.github` | `GH_TOKEN`, `GH_REPO`, `GH_BRANCH` for push automation | No (gitignored) |

## Project Structure

```
.
├── prisma/
│   └── schema.prisma          # Category, Product, Order, OrderItem models
├── public/
│   └── veeskin-brand.jpg      # Brand logo image
├── scripts/
│   └── git-push.sh            # Automated commit & push script
├── src/
│   ├── app/
│   │   ├── api/               # API routes (products, orders, categories, dashboard, seed)
│   │   ├── globals.css        # VeeSkin color palette
│   │   ├── layout.tsx         # Root layout with toaster
│   │   └── page.tsx           # Main app shell with view switching
│   ├── components/
│   │   ├── pos/               # Sidebar, Dashboard, PosTerminal, Products, Orders, Inventory
│   │   └── ui/                # shadcn/ui components
│   └── lib/
│       ├── cart-store.ts      # Zustand cart store (persisted)
│       ├── db.ts              # Prisma client
│       └── utils.ts           # cn() utility
├── worklog.md                 # Shared multi-agent work log
└── .env.github                # GitHub token (gitignored)
```

## Database Schema

```
Category  1───*  Product  *───1  OrderItem  *───1  Order
```

- **Category**: name, icon, color
- **Product**: name, sku, description, price, cost, stock, lowStock, isActive
- **Order**: orderNumber, status, paymentMethod, subtotal, tax, discount, total, itemsCount
- **OrderItem**: name, price, quantity, subtotal (snapshot at order time)

## Automated Git Push

This repo includes `scripts/git-push.sh` for automated commits and pushes:

```bash
# Auto commit message + push
./scripts/git-push.sh

# Custom commit message + push
./scripts/git-push.sh "feat: add customer loyalty feature"

# Status only (no commit/push)
./scripts/git-push.sh --status
```

The script reads `GH_TOKEN` from `.env.github`, stages all non-ignored changes, commits with a timestamped message, pushes to `origin/main`, and appends an entry to `worklog.md`.

## License

Proprietary — VeeSkin Essentials. All rights reserved.
