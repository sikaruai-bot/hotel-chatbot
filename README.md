# Hotel Sherpa Soul — Omnichannel AI Chatbot & Hospitality CRM

> **"No Restaurant. No Noise. Sleep Well."**  
> 26 Thamel Bhagwati Marg, Kathmandu 44600, Nepal  
> Website: [https://www.hotelsherpasoul.com](https://www.hotelsherpasoul.com) | Phone: +977-1-4530311 | WhatsApp: +977-9851068219

---

## 🌟 Executive Summary

Hotel Sherpa Soul is a clean, comfortable, and peaceful budget hotel in Thamel, Kathmandu. To eliminate slow manual responses, capture qualified leads 24/7, and protect guest expectations, this production-ready **Omnichannel AI Chatbot & Hospitality CRM** centralizes conversations from:

- 🟢 **WhatsApp Business Cloud API**
- 🔵 **Facebook Messenger Platform**
- 🟣 **Instagram Direct Messaging (DM)**
- 📢 **Meta Lead Ads (Instant Ingestion & Automated Greeting)**
- 🌐 **Hotel Website Interactive Chat Widget**

The system features a **Single Centralized Conversation Engine**, grounded knowledge base, progressive inquiry flows, automated human handover, dynamic pricing, and an intuitive staff CRM dashboard.

---

## 🏨 Hotel Rules & Inventory Architecture

1. **6 Sellable Guest Rooms**:
   - **Second Floor**: `201`, `202`, `203`
   - **Third Floor**: `301`, `302`, `303`
   - Room `101` does **NOT** exist.
2. **Room 102 — Shared Kitchen**:
   - Reserved exclusively for long-stay guests (minimum 2 weeks / 14 nights).
   - Equipped with 2 mini fridges, 1 oven, 2 racks, 2 tables, 4 chairs, wash basin, wastewater disposal.
   - **Strict Rule**: Never treated as a sellable room or commercial restaurant/dining hall.
3. **Strict Anti-Hallucination Guarantees**:
   - The hotel does **NOT** have a restaurant, dining hall, private parking, swimming pool, gym, or luxury facilities.
   - The bot never invents discounts, unconfirmed room availability, or taxi prices.
4. **Dynamic Database-Driven Pricing**:
   - **Deluxe Room**: starting at USD 20/night (up to 2 adults + 1 child)
   - **Budget Family Room**: starting at USD 20/night (up to 3 adults + 1 child)
   - **Family Room**: starting at USD 30/night (up to 3 adults + 1 child)
   - *All rates are stored in the database and editable via the Admin Dashboard.*

---

## 🚀 Key Features

- **Unified Omnichannel Inbox**: Real-time conversation view across WhatsApp, Messenger, Instagram, and Website.
- **Human Takeover & Bot Resume**: Staff can click "Take Over" to pause bot automation instantly, reply manually, and click "Resume Bot" whenever ready.
- **Progressive Questioning**: Avoids bombarding guests with 10 questions at once. Steps naturally: Greeting → Dates → Guests → Room Recommendation → Booking Summary.
- **Automated High-Intent Detection**: Detects booking signals and tags leads as `HIGH_INTENT` with clear score reasons for front desk priority.
- **Multilingual Support**: Automatically detects and responds naturally in **English**, **Nepali (नेपाली)**, and **Hindi (हिन्दी)**.
- **Meta Omnichannel Simulator**: Built directly into the Staff Dashboard so you can test incoming WhatsApp, Messenger, Instagram, and Lead Ad messages with 1 click without waiting for Meta developer verification!
- **Zero-Cost Grounded AI & LLM Compatibility**: Runs out of the box with a zero-cost deterministic knowledge engine, with pluggable support for OpenAI, Gemini, and Claude.

---

## 📁 Repository Structure

```
├── app/
│   ├── admin/
│   │   ├── inbox/page.tsx        # Unified Omnichannel Inbox & Staff Chat
│   │   ├── leads/page.tsx        # Lead CRM Pipeline & Direct WhatsApp CTA
│   │   ├── rooms/page.tsx        # 6-Room Inventory & Dynamic Rate Editor
│   │   ├── knowledge/page.tsx    # Knowledge Base & Booking Link Editor
│   │   ├── analytics/page.tsx    # Conversion, Channel, & Inquiry Analytics
│   │   ├── simulator/page.tsx    # Meta Webhook Test Bench & Simulator
│   │   └── layout.tsx            # Staff Dashboard Navigation
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── whatsapp/route.ts # WhatsApp Cloud API Webhook
│   │   │   ├── messenger/route.ts# FB Messenger Webhook
│   │   │   ├── instagram/route.ts# Instagram DM Webhook
│   │   │   └── meta-leads/route.ts# Meta Lead Ads Webhook
│   │   ├── chat/website/route.ts # Website Chat Widget API
│   │   └── admin/...             # Staff CRM backend endpoints
│   ├── page.tsx                  # Public Hotel Website & Guest Portal
│   └── globals.css               # Clean styling & Design System
├── components/
│   └── HotelWidget.tsx           # Floating Guest Chat Widget with WhatsApp Handoff
├── lib/
│   ├── engine/
│   │   ├── types.ts              # Unified message & conversation types
│   │   ├── intentDetector.ts     # Multilingual intent & entity extractor
│   │   ├── stateMachine.ts       # Progressive booking & inquiry state machine
│   │   ├── knowledgeBase.ts      # Grounded knowledge & anti-hallucination guard
│   │   └── chatDispatcher.ts     # Central conversation engine & deduplication
│   ├── meta/
│   │   ├── verification.ts       # Meta Webhook verification & HMAC SHA-256 check
│   │   ├── whatsapp.ts           # WhatsApp Cloud API client
│   │   ├── messenger.ts          # Messenger Platform API client
│   │   └── instagram.ts          # Instagram Messaging client
│   └── prisma.ts                 # Singleton Prisma ORM client
├── prisma/
│   ├── schema.prisma             # Relational schema (PostgreSQL & SQLite compatible)
│   └── seed.ts                   # Seed data with Hotel Sherpa Soul facts & rooms
├── test/
│   └── run-tests.ts              # Comprehensive 31-test automated suite
└── docs/                         # Detailed guides for owners & developers
```

---

## ⚡ Quick Start (Local Run in 60 Seconds)

1. **Clone and Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Database & Seed Hotel Data**:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Access the Interfaces**:
   - **Guest Website & Live Widget**: [http://localhost:3000](http://localhost:3000)
   - **Staff Dashboard & Inbox**: [http://localhost:3000/admin/inbox](http://localhost:3000/admin/inbox)
   - **Meta Omnichannel Simulator**: [http://localhost:3000/admin/simulator](http://localhost:3000/admin/simulator)

---

## 📚 Complete Documentation Index

- [SETUP.md](file:///c:/Users/lenovo/OneDrive/Desktop/hotel%20chatbot/SETUP.md) — Step-by-step local development setup.
- [META_SETUP.md](file:///c:/Users/lenovo/OneDrive/Desktop/hotel%20chatbot/META_SETUP.md) — Meta App, WhatsApp Cloud API, and token setup.
- [DATABASE.md](file:///c:/Users/lenovo/OneDrive/Desktop/hotel%20chatbot/DATABASE.md) — Schema structure, SQLite and Supabase PostgreSQL migration.
- [WEBHOOKS.md](file:///c:/Users/lenovo/OneDrive/Desktop/hotel%20chatbot/WEBHOOKS.md) — Webhook verification, payloads, and idempotency.
- [DEPLOYMENT.md](file:///c:/Users/lenovo/OneDrive/Desktop/hotel%20chatbot/DEPLOYMENT.md) — Vercel & Supabase production deployment.
- [ADMIN_GUIDE.md](file:///c:/Users/lenovo/OneDrive/Desktop/hotel%20chatbot/ADMIN_GUIDE.md) — Non-technical manual for hotel owner & front desk.
- [TROUBLESHOOTING.md](file:///c:/Users/lenovo/OneDrive/Desktop/hotel%20chatbot/TROUBLESHOOTING.md) — Common questions and diagnostic steps.
