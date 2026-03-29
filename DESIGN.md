# GrocerySaver - Family Grocery Price Comparison App

## Overview

A mobile app for a family household to manage grocery lists, scan barcodes/photos/receipts, compare prices across stores, and track spending — all powered by AI vision.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Mobile** | React Native (Expo SDK 52+) | Cross-platform, managed camera/barcode, Expo Router |
| **Navigation** | Expo Router (file-based) | Deep linking, simple structure |
| **State** | Zustand + TanStack Query | Zustand for UI state, TanStack Query for server state with caching |
| **Backend** | Node.js + Fastify + TypeScript | Fast, type-safe, shared language with frontend |
| **Database** | PostgreSQL 16 (via Supabase) | Realtime, auth, storage, and DB in one platform |
| **ORM** | Drizzle ORM | Type-safe, SQL-like, great migrations |
| **Job Queue** | BullMQ + Redis | Async receipt parsing, price fetching |
| **AI/Vision** | Claude API (Sonnet) | Fridge scanning, receipt parsing, item identification |
| **Price Data** | Kroger API, Walmart API, Open Food Facts, UPCitemdb | Major US retail coverage + nutritional data |
| **Monorepo** | pnpm workspaces | Shared types between frontend and backend |

## Architecture

```
Mobile App (Expo)
  ├── Tabs: List | Scan | Prices | Budget | Settings
  ├── Scan Screens: Barcode | Photo | Fridge | Receipt
  ├── TanStack Query (server state) + Zustand (UI state)
  └── Supabase Client (realtime sync)
         │
         ▼
Supabase Platform
  ├── Auth (future multi-user)
  ├── Realtime (list sync across devices)
  ├── Storage (images)
  └── PostgreSQL 16
         │
         ▼
Fastify API Server
  ├── Routes: /lists, /items, /prices, /scan
  ├── Services: vision, barcode, fridge, receipt, price, budget
  ├── Jobs: price-fetch, receipt-parse, pattern-analysis
  └── Integrations: Claude API, Kroger, Walmart, UPCitemdb, Open Food Facts
```

## Project Structure

```
octo-friddle/
├── packages/
│   ├── shared/          # Shared types, Zod schemas, constants
│   └── api/             # Fastify backend
│       ├── src/db/schema/    # Drizzle DB schemas
│       ├── src/routes/       # API routes
│       ├── src/services/     # Business logic
│       └── src/integrations/ # External API clients
├── apps/
│   └── mobile/          # React Native (Expo)
│       ├── app/         # Expo Router screens
│       └── src/         # Components, hooks, stores, API client
└── .github/workflows/   # CI
```

## Database Tables

- **items** — Product catalog (name, barcode, category, nutrition)
- **stores** — Retail stores with location data
- **prices** — Price data per item per store (with history)
- **lists** / **list_items** — Shopping lists with items
- **receipts** — Scanned receipt images + parsed data
- **purchase_history** — What was bought, where, for how much
- **fridge_scans** — Fridge photo analysis results
- **budgets** — Monthly budget targets
- **user_preferences** — Dietary filters, brand preferences, preferred stores

## MVP Features (Priority Order)

### Phase 1 — Foundation (Sprints 1-2)
1. **Smart grocery list** — add items by typing, barcode, photo, or voice
2. **Barcode scanner** — scan UPC, lookup product via UPCitemdb/Open Food Facts
3. **Realtime sync** — household members see list changes instantly

### Phase 2 — AI Vision (Sprints 3-4)
4. **Photo recognition** — snap a photo, Claude identifies the item
5. **Fridge scanner** — photograph fridge, AI detects items + what's running low
6. **Receipt scanner** — photograph receipt, AI extracts line items + prices

### Phase 3 — Price Comparison (Sprints 5-6)
7. **Price comparison** — per-item cheapest store, cheapest basket
8. **Price history** — track price trends from receipts + API data
9. **Store locator** — find nearby Kroger/Walmart locations

### Phase 4 — Intelligence (Sprints 7-9)
10. **Smart list building** — pattern detection ("you buy milk every 7 days")
11. **Substitution engine** — suggest store brands with price + nutrition comparison
12. **Route-optimized shopping** — split list across stores, factor in gas/time
13. **Budget dashboard** — monthly spend tracking, category breakdown, alerts
14. **Price intelligence** — "don't buy now" alerts, sale notifications

### Excluded from MVP
- Community/social features
- In-store aisle mapping
- Multi-tenant auth (hardcoded to single household)

## Key API Integrations

| API | Purpose | Auth | Rate Limit |
|-----|---------|------|------------|
| **Kroger** | Product search, prices, store locations | OAuth2 client credentials | 10K/day |
| **Walmart** | Product search, prices | API key header | 5/second |
| **UPCitemdb** | Barcode to product lookup | None (trial) | 100/day |
| **Open Food Facts** | Nutrition data, barcode fallback | None | Be respectful |
| **Claude API** | Image recognition (fridge, receipt, item photos) | API key | ~$0.01-0.03/image |
| **Google Maps** | Distance/routing (Phase 4) | API key | Pay per use |

## Claude Vision Prompts

### Fridge Scanning
```
Analyze this photo of the inside of a refrigerator. For each item:
1. "name": generic grocery name
2. "brand": brand if visible, or null
3. "quantity": "full" | "half" | "low" | "nearly_empty"
4. "category": dairy, produce, meat, etc.
5. "confidence": 0.0 to 1.0

Also note common staples that appear MISSING.
Return as JSON: { "detectedItems": [...], "missingItems": [...] }
```

### Receipt Parsing
```
Parse this grocery receipt. Extract:
1. Store name and address
2. Date (YYYY-MM-DD)
3. Line items: name, quantity, unitPrice, totalPrice, isSaleItem
4. Subtotal, tax, total
Return as JSON. Normalize item names to standard grocery terms.
```

### Item Photo
```
Identify the grocery item(s) in this photo.
Return JSON array: [{ "name", "brand", "category", "confidence" }]
```

## Key Design Decisions

1. **Supabase as platform** — DB, auth, realtime, storage in one. Drizzle ORM keeps us portable.
2. **Separate Fastify server** (not Edge Functions) — BullMQ, long-running tasks, external API keys off-client.
3. **Claude Sonnet for all vision** — best cost/quality. Haiku too weak for receipts, Opus overkill.
4. **Household ID from day one** — column exists but hardcoded. Zero-cost future multi-tenancy hook.
5. **Prices cached 6 hours** — API rate limits make real-time impractical. Grocery prices change weekly.
6. **Receipt parsing is async** — BullMQ job with status polling avoids HTTP timeouts.
7. **pnpm monorepo** — shared Zod schemas = single source of truth for data shapes across frontend + backend.

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment
cp packages/api/.env.example packages/api/.env
# Edit .env with your API keys

# Run API server
pnpm dev:api

# Run mobile app
cd apps/mobile && pnpm start
```

## External API Setup

1. **Kroger**: Apply at https://developer.kroger.com (~1-2 week approval)
2. **Walmart**: Apply at https://developer.walmart.com
3. **Anthropic**: Get API key at https://console.anthropic.com
4. **Supabase**: Create project at https://supabase.com
