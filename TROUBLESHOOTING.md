# Troubleshooting & Diagnostics Guide

Common operational questions, error codes, and diagnostic steps for Hotel Sherpa Soul's omnichannel system.

---

## 1. Meta Webhook & WhatsApp Issues

### Issue: Meta returns "The URL couldn't be validated" during webhook setup
- **Cause**: The `hub.verify_token` sent by Meta does not match your environment variable, or your server is not responding with HTTP 200 and the challenge string.
- **Solution**:
  1. Verify `META_VERIFY_TOKEN` in `.env` matches what you typed in Meta Developer Dashboard.
  2. Ensure your domain has a valid HTTPS certificate (Meta strictly rejects plain HTTP).
  3. If testing locally, ensure Ngrok is running (`ngrok http 3000`) and the URL is active.

### Issue: WhatsApp messages not delivering to guest
- **Cause**: The 24-hour Meta Customer Service Messaging Window may have expired, or your WhatsApp Cloud API token is expired/invalid.
- **Solution**:
  1. WhatsApp Cloud API allows freeform replies only within **24 hours** of the guest's last inbound message.
  2. Outside the 24-hour window, you must send an approved Meta Message Template.
  3. Verify that `WHATSAPP_ACCESS_TOKEN` is a permanent **System User Token**, not a temporary 24-hour token.

### Issue: Webhook sends duplicate messages
- **Cause**: Meta retries webhooks if your endpoint takes longer than 3 seconds to respond with HTTP 200.
- **Solution**: The system already implements deduplication via `externalMessageId`. Ensure your database queries are fast and connection pooling is active.

---

## 2. Bot & Conversation Logic Issues

### Issue: The bot replied while a staff member was typing
- **Cause**: The conversation was not switched to `HUMAN` mode.
- **Solution**: Click the purple **"Take Over"** button in the chat header. This immediately halts automated replies for that guest.

### Issue: Guest asks for availability and bot says "confirming with front desk"
- **Cause**: This is by design! As mandated by Hotel Sherpa Soul's policy:
  > *"Do NOT say a room is available unless the availability system/database confirms it. If real-time PMS integration is not yet available, say: 'Let me confirm the availability with our front desk.' Then create a staff task."*
- **Solution**: Check the PMS calendar, confirm room status, and reply directly to the guest in the Inbox.

### Issue: Guest asks for airport taxi and bot triggers handover
- **Cause**: Taxi rates are set by standard local drivers and can vary based on late-night flight arrivals. The bot safely defers to staff to avoid quoting incorrect rates.

---

## 3. Database & Local Setup Issues

### Issue: `PrismaClientInitializationError: Unable to open database file`
- **Solution**:
  1. Check that `.env` has `DATABASE_URL="file:./dev.db"`.
  2. Run `npx prisma db push` to generate the file.
  3. Ensure the folder has write permissions.

### Issue: How to test without any Meta account?
- **Solution**:
  Use the built-in **Meta Omnichannel Simulator** at `http://localhost:3000/admin/simulator`. It uses the exact same `processInboundMessage` pipeline as real webhooks.
