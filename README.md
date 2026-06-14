# Pulse — AI-Native Mini CRM for D2C Brands

> **Philosophy:** AI Suggests → Human Reviews → Human Launches → Campaign Executes.
> Every AI output is inspectable and editable before it takes any effect.

Pulse is a full-stack CRM built for the Xeno Backend Engineering Assignment. It demonstrates how AI can be *woven into the fabric* of a CRM — not bolted on as a chatbot — to help D2C brands segment audiences, generate campaign copy, select channels, and understand campaign performance.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Manu-krishnan005/pulse---crm&root=app)

---

## What Pulse Does

| Feature | How AI Helps |
|---|---|
| **Audience Builder** | Describe audience in plain English → Gemini converts it to structured filter chips you can edit |
| **Channel Recommendation** | AI analyses historical open/click rates per channel for the selected segment and recommends the best one — with a full comparison table and data-backed reasoning |
| **Campaign Copy** | AI generates 3 message variants (different tones) for the chosen channel — you pick one and edit inline before saving |
| **Delivery Pipeline** | Per-customer real-time status: Pending → Delivered → Opened → Clicked → Converted |
| **Performance Summary** | AI reads your campaign stats and writes a plain-English summary + one specific next-step recommendation |

---

## Architecture

```
┌──────────────────────────────────────┐         ┌──────────────────────────┐
│         Next.js CRM (port 3000)      │  POST   │   Channel Service        │
│                                      │ ──────► │   (port 3001)            │
│  UI Pages (App Router)               │ /send   │                          │
│  API Routes (route handlers)         │         │  Express HTTP server      │
│  Prisma ORM → PostgreSQL             │ ◄─────  │  BullMQ job queue        │
│  Gemini AI (4 integration points)    │ webhook │  Simulated delivery      │
│                                      │         │  Webhook callbacks        │
└──────────────────────────────────────┘         └──────────────────────────┘
          │                                                    │
          ▼                                                    ▼
   PostgreSQL (5432)                                   Redis (6379)
   customers, segments,                                BullMQ backing store
   campaigns, messageLogs,
   engagementHistory
```

### Callback Lifecycle

```
CRM                  Channel Service              CRM (webhook handler)
 │                         │                              │
 ├── POST /send ──────────►│                              │
 │                         ├── queue job                  │
 │                         ├── process: pending           │
 │                         ├── POST /webhook ────────────►│ status: delivered
 │                         ├── wait 2-4s (sim)            │
 │                         ├── POST /webhook ────────────►│ status: opened
 │                         ├── wait 2-4s                  │
 │                         ├── POST /webhook ────────────►│ status: clicked / converted
 │                         └── (10% failure rate)         │ status: failed
```

---

## AI Integration Points

Pulse has four distinct AI integrations, each solving a real CRM problem:

### 1. Segment Filter Generation
**File:** `app/src/lib/gemini.ts` → `generateSegmentFilter()`
**How it works:** User types a natural language description (e.g. "VIP customers who haven't ordered in 60 days"). Gemini returns structured filter JSON matching the schema. Filters are rendered as editable chips — the AI output is never final until the user saves.

### 2. Channel Recommendation with Explainability
**File:** `app/src/lib/gemini.ts` → `generateChannelSuggestion()`
**How it works:** The API fetches `EngagementHistory` records for all customers in the selected segment, aggregates open/click rates per channel, and sends the data to Gemini. The response includes:
- The recommended channel
- Per-channel open and click rate table
- A reasoning paragraph citing exact numbers and relative advantages (e.g. "2.1× higher open rate than Email")

### 3. Campaign Copy Generation
**File:** `app/src/lib/gemini.ts` → `generateCampaignCopy()`
**How it works:** Generates exactly 3 message variants with different tones (warm, urgent, formal, casual). Channel-specific constraints are enforced in the prompt (SMS: 160 char limit, Email: subject + body, WhatsApp: emoji-friendly, RCS: button CTAs). The user selects one and edits it inline.

### 4. Performance Summary
**File:** `app/src/lib/gemini.ts` → `generatePerformanceSummary()`
**How it works:** After a campaign completes, the user can request an AI summary. Gemini receives the delivery/open/click/conversion stats and returns a 2-3 sentence plain-English summary, a sentiment label, key highlights as badges, and one specific next-campaign recommendation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 15 App Router + TypeScript |
| Database | PostgreSQL with Prisma ORM |
| AI | Google Gemini 2.5 Flash (free tier — no credit card required) |
| Async Queue | BullMQ + Redis (via Docker) |
| Channel Service | Express microservice |
| Styling | Tailwind CSS with custom design system |

---

## Design Decisions & Tradeoffs

### What we built and why

**Separate Channel Service (microservice pattern)**
Instead of calling a delivery provider inline, the CRM POSTs to a separate Express service which queues the job in BullMQ (backed by Redis) and delivers asynchronously. This means:
- The CRM never blocks on delivery
- Each customer gets an individual job (no bulk fire-and-forget)
- Delivery failures don't crash the campaign
- Webhook callbacks update each customer's status independently

**AI as a suggestion layer, not an executor**
All four AI integrations produce *suggestions* that the user must explicitly approve. There is no autonomous AI triggering. This is intentional — it keeps the human in the loop and makes the system safe to demo and explain in interviews.

**Engagement History for channel scoring**
The database includes an `EngagementHistory` table seeded with realistic per-customer, per-channel open/click history. This gives the channel recommendation AI real data to work with rather than making it hallucinate channel stats.

**Mock fallbacks for every AI call**
Every Gemini call is wrapped in a try/catch with a smart mock fallback. This means the product is fully functional (and demoed correctly) even without a Gemini API key.

### What we deliberately didn't build

| Excluded | Reason |
|---|---|
| Twilio / real SMS delivery | Would require billing setup, phone number registration, and compliance — not the point of the assignment |
| OAuth / multi-tenant auth | Authentication scaffolding would add 2-3 days and obscure the CRM logic that matters |
| Drag-and-drop campaign builders | Adds UI complexity without demonstrating the system design and AI integration quality |
| Heavy ML models | Gemini Flash gives GPT-4-class reasoning without hosting infrastructure |
| Autonomous campaign execution | An AI that auto-sends campaigns is high-risk to demo; the human-in-the-loop pattern is the right default |

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL + Redis)
- Node.js 18+
- A free [Google Gemini API key](https://aistudio.google.com/app/apikey) (optional — mock fallbacks work without it)

### Step 1: Start PostgreSQL + Redis

```powershell
# From the project root:
docker compose up -d
```

### Step 2: Configure the AI key

Open `app/.env.local` and set:
```
GEMINI_API_KEY="your-key-here"
```
> If you skip this, all AI features fall back to smart mock responses — the app is still fully functional.

### Step 3: Install & seed

```powershell
# App dependencies + DB setup
cd app
npm install
npm run db:push    # Creates all tables
npm run db:seed    # Seeds 200 customers with realistic data

# Channel service
cd ../channel-service
npm install
cd ..
```

### Step 4: Run both services

**Terminal 1** — CRM app:
```powershell
cd app
npm run dev
```

**Terminal 2** — Channel service:
```powershell
cd channel-service
npm run dev
```

Open **[http://localhost:3000](https://pulse-crm-twwx.vercel.app)** 

---

## End-to-End Demo Flow

1. **Customers** — Browse the 200 seeded customers with spend, order history, and tags
2. **Audience** — Type *"High value customers who haven't ordered in 60 days"* → AI builds filter chips → preview matching customers → save segment
3. **New Campaign** → Select segment → AI shows channel comparison table with open/click rates and reasoning → pick channel → AI generates 3 message variants → pick + edit → name + save
4. **Send** → Click "Send Campaign" → watch the delivery pipeline update per-customer in real time
5. **Analytics** → Click "Generate AI Summary" to get a plain-English performance report with next steps

---

## Stopping Everything

```powershell
# Stop Docker services
docker compose down
```
