# Local Setup & Installation Guide

Follow these simple instructions to set up the Hotel Sherpa Soul Omnichannel Chatbot & CRM on your local development machine.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or later (Node v20+ recommended)
- **npm**: v9.0.0 or later
- **Git**: Installed on your system

---

## 2. Installation Steps

### Step A: Clone or Navigate to Project
```bash
cd "c:\Users\lenovo\OneDrive\Desktop\hotel chatbot"
```

### Step B: Install Node Packages
```bash
npm install
```

### Step C: Environment Variables Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
*(On Windows PowerShell, use `copy .env.example .env` if needed).*

The `.env` file comes preconfigured for instant zero-config SQLite local operation:
```env
APP_URL=http://localhost:3000
DATABASE_URL="file:./dev.db"
META_VERIFY_TOKEN=sherpa_soul_webhook_verify_token_2026
```

### Step D: Initialize and Seed the Database
Run Prisma migrations and seed the initial Hotel Sherpa Soul data:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

This automatically sets up:
- The 6 sellable guest rooms (`201`, `202`, `203`, `301`, `302`, `303`)
- Room `102` (Shared Kitchen for stays $\ge$ 2 weeks)
- Starting room rates ($20 Deluxe, $20 Budget Family, $30 Family)
- Anti-hallucination policies and knowledge base entries
- Sample test customer and lead

### Step E: Run the Automated Test Suite
Verify that all 31 test assertions pass:
```bash
npm test
```

### Step F: Start the Development Server
```bash
npm run dev
```

Open your browser:
- **Guest Website & Live Chat Widget**: [http://localhost:3000](http://localhost:3000)
- **Staff Unified Inbox**: [http://localhost:3000/admin/inbox](http://localhost:3000/admin/inbox)
- **Lead CRM Pipeline**: [http://localhost:3000/admin/leads](http://localhost:3000/admin/leads)
- **6-Room Inventory & Dynamic Rates**: [http://localhost:3000/admin/rooms](http://localhost:3000/admin/rooms)
- **Omnichannel Simulator**: [http://localhost:3000/admin/simulator](http://localhost:3000/admin/simulator)

---

## 3. Testing Without Live Meta Credentials

You do **not** need to wait for Meta App approvals to test the entire omnichannel chatbot!
1. Go to [http://localhost:3000/admin/simulator](http://localhost:3000/admin/simulator).
2. Click any of the **1-Click Test Scenarios** (e.g., *Room Prices Inquiry*, *Booking with Dates*, *Anti-Hallucination Guard*, *Nepali Language Test*).
3. Watch the bot classify the intent, extract travel dates and guest counts, and respond immediately.
4. Click **"Open in Live Inbox"** to inspect the conversation as front-desk staff would see it.
