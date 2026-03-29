# GrocerySmart - Family Grocery Price Comparison App

## Design & Implementation Plan

### App Name (Working Title): **GrocerySmart**

A mobile app that finds the lowest prices on grocery items using AI vision, barcode scanning, and real-time price comparison across local stores. Built for a single household.

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Mobile Framework** | React Native (Expo) | Cross-platform iOS/Android from one codebase. Expo simplifies builds, OTA updates, and camera/barcode access |
| **Language** | TypeScript | Type safety across frontend and backend |
| **Backend** | Node.js + Express | Shared language with frontend, excellent async I/O for API aggregation |
| **Database** | Supabase (PostgreSQL) | Hosted Postgres + real-time subscriptions + auth + storage — replaces need for separate DB, auth, and file hosting |
| **AI Vision** | Claude API (claude-sonnet-4-6) | Best-in-class image understanding for fridge photos, receipts, and product identification |
| **Barcode Scanning** | expo-barcode-scanner | Native barcode/QR scanning built into Expo |
| **Product Data** | Open Food Facts API + UPCitemdb API | Free product databases keyed by UPC/EAN barcode |
| **Price Data** | Kroger API + Walmart API (via RapidAPI) | Two largest US grocers with developer APIs |
| **Maps/Routing** | Google Maps Platform | Directions, distance matrix, store locations |
| **State Management** | Zustand | Lightweight, minimal boilerplate, works great with React Native |
| **Charts** | Victory Native | Analytics/price history visualizations |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────┐
│         React Native (Expo)         │
│  ┌───────┐ ┌────────┐ ┌─────────┐  │
│  │ Lists │ │ Camera │ │ Budget  │  │
│  │ Screen│ │ /Scan  │ │Dashboard│  │
│  └───┬───┘ └───┬────┘ └────┬────┘  │
│      └─────────┼───────────┘        │
│           Zustand Store             │
└────────────┬────────────────────────┘
             │ HTTPS
┌────────────▼────────────────────────┐
│      Supabase Backend               │
│  ┌──────────┐  ┌─────────────────┐  │
│  │ Postgres │  │  Edge Functions  │  │
│  │  (Data)  │  │  (API proxies)  │  │
│  └──────────┘  └────────┬────────┘  │
│  ┌──────────┐           │           │
│  │ Realtime │           │           │
│  │  (Sync)  │           │           │
│  └──────────┘           │           │
└─────────────────────────┼───────────┘
                          │
          ┌───────────────┼──────────────┐
          │               │              │
   ┌──────▼───┐   ┌──────▼───┐   ┌──────▼──────┐
   │  Claude   │   │  Kroger  │   │  Open Food  │
   │   API     │   │  Walmart │   │  Facts /    │
   │ (Vision)  │   │  APIs    │   │  UPCitemdb  │
   └──────────┘   └──────────┘   └─────────────┘
```

**Key decisions:**
- **Supabase Edge Functions** act as API proxy — keeps API keys server-side, handles rate limiting, caches price lookups
- **Supabase Realtime** syncs grocery lists across family members' phones instantly
- **Claude API** runs server-side in Edge Functions (send image → get structured JSON back)
- **Offline support** via Zustand persist — lists work offline, sync when reconnected

---

## 3. Data Models

### `households`
```sql
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `members`
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `products`
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT UNIQUE,            -- UPC/EAN
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,                  -- e.g. "dairy", "produce", "meat"
  image_url TEXT,
  nutrition JSONB,                -- calories, protein, etc.
  tags TEXT[],                    -- "organic", "gluten-free", etc.
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `stores`
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,             -- "Kroger", "Walmart", "Aldi"
  chain TEXT,                     -- normalized chain name
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  api_source TEXT,                -- "kroger", "walmart", "manual"
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `prices`
```sql
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  store_id UUID REFERENCES stores(id),
  price DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,4),       -- price per oz/lb for comparison
  unit TEXT,                      -- "oz", "lb", "each"
  sale_price DECIMAL(10,2),
  sale_ends_at TIMESTAMPTZ,
  source TEXT,                    -- "kroger_api", "walmart_api", "receipt_scan", "manual"
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, store_id, fetched_at)
);
-- Index for price history queries
CREATE INDEX idx_prices_product_date ON prices(product_id, fetched_at DESC);
```

### `lists`
```sql
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  name TEXT NOT NULL,             -- "Weekly Groceries", "Costco Run"
  status TEXT DEFAULT 'active',   -- "active", "shopping", "completed"
  created_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### `list_items`
```sql
CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  custom_name TEXT,               -- if product not in DB yet
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'each',
  checked BOOLEAN DEFAULT false,
  checked_by UUID REFERENCES members(id),
  added_by UUID REFERENCES members(id),
  notes TEXT,
  preferred_store_id UUID REFERENCES stores(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `receipts`
```sql
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  store_id UUID REFERENCES stores(id),
  image_url TEXT,                 -- stored in Supabase Storage
  scanned_at TIMESTAMPTZ DEFAULT now(),
  total DECIMAL(10,2),
  tax DECIMAL(10,2),
  raw_text TEXT,                  -- OCR output for debugging
  scanned_by UUID REFERENCES members(id)
);
```

### `receipt_items`
```sql
CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  name_on_receipt TEXT,           -- raw text from receipt
  quantity DECIMAL(10,2) DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,4),
  was_on_sale BOOLEAN DEFAULT false
);
```

### `purchase_history`
```sql
CREATE VIEW purchase_history AS
SELECT
  ri.product_id,
  p.name AS product_name,
  p.category,
  s.name AS store_name,
  ri.price,
  ri.quantity,
  r.scanned_at AS purchased_at,
  r.household_id
FROM receipt_items ri
JOIN receipts r ON ri.receipt_id = r.id
JOIN products p ON ri.product_id = p.id
JOIN stores s ON r.store_id = s.id;
```

### `budget`
```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  weekly_limit DECIMAL(10,2),
  monthly_limit DECIMAL(10,2),
  categories JSONB,               -- per-category limits: {"dairy": 50, "meat": 80}
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `pantry_items`
```sql
CREATE TABLE pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'each',
  location TEXT DEFAULT 'pantry', -- "fridge", "freezer", "pantry"
  expires_at DATE,
  last_scanned_at TIMESTAMPTZ,
  status TEXT DEFAULT 'stocked',  -- "stocked", "low", "out"
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. API Integrations

### 4a. Claude API (AI Vision)
**Used for:** Fridge scanning, receipt OCR, product photo recognition

```typescript
// Edge Function: /functions/v1/vision/analyze
// Send image + mode → get structured response

type VisionMode = 'fridge' | 'receipt' | 'product' | 'shelf';

// Fridge scan prompt example:
const FRIDGE_PROMPT = `Analyze this refrigerator photo. Identify all visible food items.
For each item return JSON: { items: [{ name, category, estimatedQuantity, status: "full"|"low"|"empty" }] }`;

// Receipt scan prompt example:
const RECEIPT_PROMPT = `Extract all items from this grocery receipt.
Return JSON: { store, date, items: [{ name, quantity, price, unitPrice }], subtotal, tax, total }`;
```

### 4b. Kroger API
- **Auth:** OAuth 2.0 client credentials
- **Endpoints:** Product search, pricing, store locations
- **Rate limit:** 10 calls/second
- **Register at:** https://developer.kroger.com

### 4c. Walmart API (via RapidAPI or Walmart Open API)
- **Auth:** API key
- **Endpoints:** Product search, store finder, pricing
- **Register at:** https://developer.walmart.com

### 4d. Open Food Facts
- **Auth:** None (free, open)
- **Use:** Product info by barcode: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- **Returns:** Name, brand, nutrition, allergens, images

### 4e. UPCitemdb
- **Auth:** API key (free tier: 100 lookups/day)
- **Use:** Barcode → product name/brand when Open Food Facts misses

### 4f. Google Maps Platform
- **Directions API:** Route optimization between stores
- **Distance Matrix API:** Calculate drive time/gas cost
- **Places API:** Find nearby grocery stores

---

## 5. Phased Implementation Plan

### Phase 1: Foundation (Sprint 1-2)
> **Goal:** Working grocery list app with real-time family sync

- [ ] Initialize Expo project with TypeScript
- [ ] Set up Supabase project (database, auth, storage)
- [ ] Run database migrations (all tables above)
- [ ] Build core navigation (tab bar: Lists, Scan, Pantry, Budget)
- [ ] Implement household auth (simple invite code, no complex auth)
- [ ] Build grocery list CRUD (add/edit/delete/check items)
- [ ] Real-time list sync across devices via Supabase Realtime
- [ ] Basic product search (type to search local DB + Open Food Facts)
- [ ] Offline mode with Zustand persist + sync queue

**Deliverable:** Family can create, share, and check off grocery lists in real time

### Phase 2: Scanning & Vision (Sprint 3-4)
> **Goal:** Add all camera-based input methods

- [ ] Barcode scanner (expo-barcode-scanner)
- [ ] Barcode → product lookup (Open Food Facts → UPCitemdb fallback)
- [ ] Auto-add scanned product to current list
- [ ] Photo product recognition via Claude API
- [ ] Receipt scanner: capture → Claude OCR → parse items + prices
- [ ] Store receipt data + extracted items in DB
- [ ] Fridge scanner: capture → Claude vision → identify items
- [ ] "What's missing?" — compare fridge scan to usual purchases
- [ ] Multi-item photo: snap shelf/counter → identify multiple items

**Deliverable:** Add items by barcode, photo, receipt scan, or fridge photo

### Phase 3: Price Comparison (Sprint 5-6)
> **Goal:** Find the cheapest prices across stores

- [ ] Integrate Kroger API (OAuth flow, product search, pricing)
- [ ] Integrate Walmart API (product search, pricing)
- [ ] Price fetch Edge Function: product → query all store APIs → return sorted prices
- [ ] Store price data in `prices` table for history
- [ ] List view: show cheapest store per item with price
- [ ] "Cheapest basket" calculator: optimal store(s) for entire list
- [ ] Store locator: find nearby stores using Google Places
- [ ] Cache prices (refresh every 24h, or on-demand)

**Deliverable:** See price comparison for each item; know where to shop for best deal

### Phase 4: Smart Features (Sprint 7-8)
> **Goal:** Intelligence layer — predictions, suggestions, optimization

- [ ] **Purchase pattern analysis:** Track frequency of buys per product
- [ ] **Restock reminders:** "You buy milk every 7 days — add to list?"
- [ ] **Substitution engine:** Find cheaper store-brand alternatives
  - Match by category + similar name/nutrition
  - Show price diff + nutritional comparison
  - "Brand loyalty" setting to skip suggestions for preferred brands
- [ ] **Price intelligence:**
  - Historical price chart per product (Victory Native)
  - Price trend indicators: "cheaper than usual" / "at seasonal high"
  - "Best time to buy" suggestions based on historical data
- [ ] **Meal plan integration:**
  - Simple recipe storage (name, ingredients)
  - "Add recipe ingredients to list" one-tap
  - Dietary filter tags on products/recipes

**Deliverable:** App proactively suggests restocks, cheaper alternatives, and best buying times

### Phase 5: Route & Budget (Sprint 9-10)
> **Goal:** Optimize shopping trips and track spending

- [ ] **Route optimization:**
  - "Split list" mode: divide items across 2-3 stores for max savings
  - Calculate gas/time cost (Google Distance Matrix)
  - Show net savings after travel cost
  - Generate optimized driving route (Google Directions)
  - Threshold setting: "only split if savings > $X"
- [ ] **Budget dashboard:**
  - Set weekly/monthly budget
  - Track spending from scanned receipts
  - Category breakdown (pie chart)
  - Spending trend over time (line chart)
  - Budget alerts: push notification at 80%/100%
  - "You saved $X this month by following suggestions"
- [ ] **Coupon/deal aggregation:**
  - Pull sale prices from Kroger/Walmart APIs
  - Highlight items on your list that are currently on sale
  - Price-match helper: "Target will match this Walmart price"

**Deliverable:** Full budget tracking, route-optimized multi-store trips, deal alerts

---

## 6. Project Structure

```
octo-friddle/
├── app/                          # Expo Router (file-based routing)
│   ├── (tabs)/
│   │   ├── index.tsx             # Lists tab (home)
│   │   ├── scan.tsx              # Scan/Camera tab
│   │   ├── pantry.tsx            # Pantry/Fridge tab
│   │   └── budget.tsx            # Budget/Analytics tab
│   ├── list/
│   │   └── [id].tsx              # Individual list view
│   ├── product/
│   │   └── [id].tsx              # Product detail + price comparison
│   ├── receipt/
│   │   └── [id].tsx              # Receipt detail view
│   └── _layout.tsx               # Root layout
├── components/
│   ├── lists/
│   │   ├── ListCard.tsx
│   │   ├── ListItem.tsx
│   │   └── AddItemModal.tsx
│   ├── scan/
│   │   ├── BarcodeScanner.tsx
│   │   ├── PhotoCapture.tsx
│   │   └── ReceiptScanner.tsx
│   ├── prices/
│   │   ├── PriceComparison.tsx
│   │   ├── PriceChart.tsx
│   │   └── StoreBadge.tsx
│   ├── budget/
│   │   ├── SpendingChart.tsx
│   │   ├── BudgetMeter.tsx
│   │   └── CategoryBreakdown.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Card.tsx
│       └── SearchBar.tsx
├── lib/
│   ├── supabase.ts               # Supabase client init
│   ├── claude.ts                 # Claude API helpers (called via Edge Functions)
│   ├── stores/                   # Zustand stores
│   │   ├── listStore.ts
│   │   ├── productStore.ts
│   │   ├── priceStore.ts
│   │   └── budgetStore.ts
│   ├── hooks/
│   │   ├── useRealtimeList.ts
│   │   ├── usePriceComparison.ts
│   │   └── useBarcodeScanner.ts
│   └── utils/
│       ├── priceCalculator.ts    # Basket optimization logic
│       ├── routeOptimizer.ts     # Multi-store route planning
│       └── patternAnalyzer.ts    # Purchase frequency detection
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_indexes_and_views.sql
│   └── functions/
│       ├── vision-analyze/       # Claude API proxy
│       ├── price-lookup/         # Store API aggregator
│       ├── product-lookup/       # Barcode → product info
│       └── route-optimize/       # Google Maps proxy
├── assets/
│   ├── images/
│   └── fonts/
├── app.json                      # Expo config
├── package.json
├── tsconfig.json
└── DESIGN.md                     # This file
```

---

## 7. Key Architectural Decisions

### Why Supabase over Firebase?
- **PostgreSQL** gives us relational queries (JOINs for price comparisons, aggregations for budget tracking) that Firestore can't do efficiently
- **Realtime** subscriptions cover the family sync need
- **Edge Functions** (Deno) replace a standalone backend server
- **Row Level Security** can scope data to household without complex auth
- **Cheaper** at this scale (free tier covers a family easily)

### Why Claude for Vision instead of Google ML Kit?
- Google ML Kit is great for barcode scanning (and we use it for that)
- But for **understanding** images (what's in a fridge, reading receipts with context, identifying products from photos), Claude's multimodal capabilities are significantly more accurate
- Claude can return **structured JSON** directly — no post-processing pipeline needed
- One API for all vision tasks (fridge, receipt, product, shelf)

### Why Edge Functions as API Proxy?
- **API keys stay server-side** (never in the mobile app)
- **Rate limiting and caching** in one place
- **Normalize responses** from different store APIs into a common format
- **Cost control** — cache Claude/store API responses to avoid redundant calls

### Why Expo over bare React Native?
- **Faster development** — managed workflow handles native builds
- **OTA updates** — push fixes without app store review
- **Built-in camera, barcode, haptics** — less native module headaches
- For a family app, the tradeoff of slightly larger bundle size is worth it

### Offline Strategy
- Zustand with `persist` middleware stores lists, products, and recent prices locally
- Offline edits queue in a sync buffer
- On reconnect, replay queue against Supabase (last-write-wins for simplicity)
- Prices always require network (cached for 24h)

---

## 8. Environment & API Keys Needed

| Service | Key Type | Free Tier |
|---|---|---|
| Supabase | Project URL + anon key | 500MB DB, 1GB storage, 2GB bandwidth |
| Claude API (Anthropic) | API key | Pay-per-use (~$0.003 per image analysis) |
| Kroger Developer | Client ID + Secret | 10,000 calls/month |
| Walmart Developer | API key | 5,000 calls/day |
| UPCitemdb | API key | 100 lookups/day |
| Google Maps Platform | API key | $200/month free credit |

**Estimated monthly cost for a family:** $5-15 (mostly Claude API usage for photo scans)

---

## 9. Getting Started (First Steps)

```bash
# 1. Initialize Expo project
npx create-expo-app@latest octo-friddle --template expo-template-blank-typescript

# 2. Install core dependencies
npx expo install @supabase/supabase-js zustand expo-camera expo-barcode-scanner
npx expo install @react-navigation/native @react-navigation/bottom-tabs
npx expo install expo-image-picker expo-file-system
npm install victory-native

# 3. Set up Supabase
npx supabase init
npx supabase db push  # runs migrations

# 4. Create .env.local
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 10. Future Considerations (Post-MVP)

- **Multi-household support** — if expanding beyond family
- **Community price reporting** — crowdsourced prices for stores without APIs
- **Apple Watch / Wear OS** — quick list view on wrist while shopping
- **Voice assistant integration** — "Hey Siri, add milk to my grocery list"
- **Expiration date tracking** — scan expiry dates, get "use soon" alerts
- **Automatic reordering** — connect to Instacart/store delivery APIs
