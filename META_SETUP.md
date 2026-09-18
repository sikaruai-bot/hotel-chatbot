# Meta Developer Platform Integration Guide

This guide provides instructions for connecting Hotel Sherpa Soul's official **WhatsApp Business Cloud API**, **Facebook Messenger**, **Instagram DM**, and **Meta Lead Ads**.

---

## 1. Meta Developer App Creation

1. Go to [Meta for Developers](https://developers.facebook.com/) and log in with the hotel's business Facebook account.
2. Click **My Apps** → **Create App**.
3. Select **Other** → **Business** as the app type.
4. Name the app: `Hotel Sherpa Soul Chatbot CRM`.
5. Connect your official **Meta Business Account** (Hotel Sherpa Soul).

---

## 2. WhatsApp Business Cloud API Setup

### Step A: Add WhatsApp Product
1. From your App Dashboard, find **WhatsApp** and click **Set up**.
2. Under **API Setup**, Meta will provide:
   - **Phone number ID** (Copy to `WHATSAPP_PHONE_NUMBER_ID` in `.env`)
   - **WhatsApp Business Account ID** (Copy to `WHATSAPP_BUSINESS_ACCOUNT_ID` in `.env`)
   - **Temporary Access Token** (Used for testing)

### Step B: Generate Permanent System User Token
*Do not use temporary 24-hour tokens in production!*
1. Go to [Meta Business Suite](https://business.facebook.com/) → **Settings** → **Users** → **System Users**.
2. Click **Add**, name the user `SherpaSoulBot`, role: `Admin`.
3. Click **Generate New Token**, select your App, and enable permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copy the generated permanent token to `WHATSAPP_ACCESS_TOKEN` in `.env`.

### Step C: Configure Webhook
1. In Meta App Dashboard, navigate to **WhatsApp** → **Configuration**.
2. Click **Edit** on Webhook:
   - **Callback URL**: `https://your-domain.com/api/webhooks/whatsapp` (or your Ngrok URL during local testing)
   - **Verify Token**: Must match `META_VERIFY_TOKEN` from your `.env` (default: `sherpa_soul_webhook_verify_token_2026`).
3. Click **Verify and Save**.
4. In Webhook fields, click **Manage** and subscribe to:
   - `messages` (Inbound guest messages)
   - `message_status` (Sent, delivered, read receipts)

---

## 3. Facebook Messenger Integration

1. In Meta App Dashboard, click **Add Product** → **Messenger**.
2. Under **Settings** → **Access Tokens**, link the official **Hotel Sherpa Soul** Facebook Page.
3. Click **Generate Token** and copy it to `FACEBOOK_PAGE_ACCESS_TOKEN` in `.env`.
4. Copy your Page ID to `FACEBOOK_PAGE_ID`.
5. In **Webhooks**:
   - **Callback URL**: `https://your-domain.com/api/webhooks/messenger`
   - **Verify Token**: `sherpa_soul_webhook_verify_token_2026`
   - Subscribe to: `messages`, `messaging_postbacks`.

---

## 4. Instagram Direct Messaging Integration

1. Ensure the hotel's Instagram profile is an **Instagram Professional / Business Account** and linked to the hotel's Facebook Page.
2. In Meta App Dashboard, add **Instagram Graph API**.
3. Under **Webhooks** → select **Instagram**:
   - **Callback URL**: `https://your-domain.com/api/webhooks/instagram`
   - **Verify Token**: `sherpa_soul_webhook_verify_token_2026`
   - Subscribe to: `messages`.
4. Copy your Instagram Account ID to `INSTAGRAM_ACCOUNT_ID`.

---

## 5. Meta Lead Ads Webhook Setup

1. In Meta App Dashboard, navigate to **Webhooks** → select **Page** from dropdown.
2. Click **Subscribe to this object**:
   - **Callback URL**: `https://your-domain.com/api/webhooks/meta-leads`
   - **Verify Token**: `sherpa_soul_webhook_verify_token_2026`
   - Subscribe to: `leadgen`.
3. When a traveler submits an Instant Form on Facebook or Instagram, Meta sends a `leadgen` event:
   - The system ingests the lead name, phone, email, campaign, and adset.
   - Marks the lead as `NEW` in the Lead CRM.
   - Sends the automated first greeting message via WhatsApp or Messenger.

---

## 6. Testing Webhooks Locally via Ngrok

To receive real Meta webhooks on your local computer:
1. Run Ngrok:
   ```bash
   ngrok http 3000
   ```
2. Copy your public HTTPS URL (e.g., `https://abc1234.ngrok-free.app`).
3. Provide the full endpoint to Meta:
   - WhatsApp: `https://abc1234.ngrok-free.app/api/webhooks/whatsapp`
   - Messenger: `https://abc1234.ngrok-free.app/api/webhooks/messenger`
   - Instagram: `https://abc1234.ngrok-free.app/api/webhooks/instagram`
   - Lead Ads: `https://abc1234.ngrok-free.app/api/webhooks/meta-leads`
