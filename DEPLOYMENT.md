# Production Deployment Guide (Vercel & Supabase)

This guide walks you through deploying Hotel Sherpa Soul's Omnichannel Chatbot and CRM to production using **Vercel** and **Supabase**.

---

## 1. Step-by-Step Production Deployment

### Step 1: Create Supabase PostgreSQL Database
1. Go to [Supabase](https://supabase.com/) and create a new project: `hotel-sherpa-soul-db`.
2. Choose **Singapore (ap-southeast-1)** or **India (ap-south-1)** for lowest latency to Nepal.
3. Under **Project Settings** → **Database**, copy the connection string (URI mode).

### Step 2: Push Git Repository to GitHub
1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial Hotel Sherpa Soul chatbot commit"
   ```
2. Create a private repository on GitHub and push:
   ```bash
   git remote add origin https://github.com/your-account/hotel-sherpa-soul-crm.git
   git branch -M main
   git push -u origin main
   ```

### Step 3: Deploy to Vercel
1. Log into [Vercel](https://vercel.com/) and click **Add New** → **Project**.
2. Import the `hotel-sherpa-soul-crm` GitHub repository.
3. In **Build and Output Settings**:
   - Framework Preset: **Next.js**
   - Build Command: `prisma generate && next build`
4. Add Environment Variables (see checklist below).
5. Click **Deploy**.

---

## 2. Production Environment Variables Checklist

Configure these in **Vercel Project Settings** → **Environment Variables**:

| Variable Name | Example / Value | Description |
| :--- | :--- | :--- |
| `APP_URL` | `https://crm.hotelsherpasoul.com` | Live production URL |
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public` | Supabase Postgres URL |
| `META_APP_ID` | `123456789012345` | Meta App ID |
| `META_APP_SECRET` | `a1b2c3d4e5f6...` | Meta App Secret for signature checks |
| `META_VERIFY_TOKEN` | `sherpa_soul_prod_token_2026` | Webhook verification token |
| `WHATSAPP_ACCESS_TOKEN` | `EAAG...` | Permanent System User Token |
| `WHATSAPP_PHONE_NUMBER_ID`| `109876543210987` | Official WhatsApp Phone ID |
| `WHATSAPP_BUSINESS_ACCOUNT_ID`| `987654321098765` | Meta WABA ID |
| `FACEBOOK_PAGE_ID` | `1029384756` | Hotel Sherpa Soul FB Page ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN`| `EAAG...` | Page token for Messenger |
| `INSTAGRAM_ACCOUNT_ID` | `178414...` | Instagram Business ID |
| `INSTAGRAM_ACCESS_TOKEN` | `EAAG...` | Token for Instagram DMs |
| `AI_PROVIDER` | `auto` | AI engine mode |
| `HOTEL_FRONTDESK_PHONE` | `+977-1-4530311` | Front desk phone |
| `HOTEL_WHATSAPP_PHONE` | `+977-9851068219` | WhatsApp number |

---

## 3. Seed Production Database

Once deployed, run the seed script once to populate the initial hotel knowledge base, room types, and 6 rooms:
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

---

## 4. Custom Domain Configuration

1. In Vercel, go to **Settings** → **Domains**.
2. Add your custom subdomain, e.g., `chat.hotelsherpasoul.com` or `crm.hotelsherpasoul.com`.
3. Add the CNAME record in your DNS provider (Cloudflare, Namecheap, etc.):
   - Type: `CNAME`
   - Name: `crm`
   - Target: `cname.vercel-dns.com`
