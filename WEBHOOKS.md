# Webhook Architecture & Integration Reference

Hotel Sherpa Soul's omnichannel messaging relies on high-throughput, secure webhooks for real-time guest communication.

---

## 1. Webhook Endpoints

| Endpoint | Protocol | Purpose |
| :--- | :--- | :--- |
| `/api/webhooks/whatsapp` | GET / POST | WhatsApp Business Cloud API incoming messages and statuses |
| `/api/webhooks/messenger` | GET / POST | Facebook Messenger incoming messages and quick replies |
| `/api/webhooks/instagram` | GET / POST | Instagram Direct Messaging conversations |
| `/api/webhooks/meta-leads` | GET / POST | Meta Lead Ads instant form submission ingestion |
| `/api/chat/website` | POST | Hotel website chat widget communication |

---

## 2. Meta Handshake Protocol (GET Request)

When configuring webhooks in the Meta Developer Dashboard, Meta sends an initial validation request:
```http
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=1158201444&hub.verify_token=sherpa_soul_webhook_verify_token_2026
```

### Handler Logic
```typescript
const mode = searchParams.get('hub.mode');
const token = searchParams.get('hub.verify_token');
const challenge = searchParams.get('hub.challenge');

if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
  return new NextResponse(challenge, { status: 200 });
}
return new NextResponse('Forbidden', { status: 403 });
```

---

## 3. Cryptographic Signature Verification (POST Request)

Meta signs every webhook payload with an HMAC-SHA256 hash using your `META_APP_SECRET`:
```http
X-Hub-Signature-256: sha256=d57c89f563cee44f95a56f26e534f3780f2d...
```

The system verifies this header before processing any event:
```typescript
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true; // Allows local developer testing when secret is not set
  if (!signatureHeader) return false;

  const expectedSignature = signatureHeader.split('sha256=')[1];
  const calculatedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf-8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

---

## 4. Idempotency & Deduplication

Meta webhooks can resend the same event multiple times if network latency occurs. To prevent sending duplicate replies to guests:
1. Every incoming Meta message carries an `externalMessageId` (e.g. `wamid.HBgLM...`).
2. Before invoking the state machine or sending replies, the engine queries:
   ```typescript
   const existing = await prisma.message.findUnique({
     where: { externalMessageId: msg.externalMessageId },
   });
   if (existing) {
     return { success: true, deduplicated: true };
   }
   ```
3. The duplicate event is safely acknowledged with HTTP 200 without duplicate bot output.

---

## 5. Human Mode Bypass

When a front desk staff member clicks **"Take Over"** on an active conversation:
1. The conversation mode changes to `HUMAN`.
2. Any subsequent incoming webhook messages from that customer are logged into the message stream, `unreadStaff` is flagged, but the automated bot reply is suppressed.
3. When the staff clicks **"Resume Bot"**, automation turns back on.
