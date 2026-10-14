# Domain Email Authentication Audit & Setup: hotelsherpasoul.com

**Domain:** `hotelsherpasoul.com`  
**Official Email:** `info@hotelsherpasoul.com`  
**Nameservers:** Vercel DNS (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`)  
**Audit Date:** October 2026  
**Status:** Audit Completed — Exact Records Prepared for Owner Approval

---

## 1. Executive Summary & Audit Findings

| Component | Current Live Status | Security Assessment | Action Required |
| :--- | :--- | :--- | :--- |
| **SPF** | `v=spf1 ip4:202.63.243.186 include:resend.com ~all` | ⚠️ **Partial** (includes Resend & host IP; softfail ~all) | Retain or harmonize with any secondary mail providers |
| **DKIM** | `resend._domainkey.hotelsherpasoul.com` not found | ❌ **Missing** (Outgoing emails risk spam folder / fail DKIM check) | Add Resend DKIM CNAME record |
| **DMARC** | `_dmarc.hotelsherpasoul.com` not found | ❌ **Missing** (Zero spoofing protection or visibility into unauthorized senders) | Add DMARC TXT record starting at `p=none` (monitor only) |
| **MX** | `mail.hotelsherpasoul.com` (Pref 10) | ℹ️ **Legacy host** (Inbound emails route to local mail server) | Configure MX routing or forwarding to Resend Inbound Webhook |

> [!IMPORTANT]
> **Strict Safety Rule:** DNS records must NOT be applied directly to production DNS without explicit owner approval. Provide these exact specifications to the domain administrator.

---

## 2. Exact DNS Records Required

### Record 1: DMARC Policy (Monitor-Only Mode)
*Must start at `p=none` to collect delivery reports without rejecting legitimate mail.*

| Type | Host / Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| **TXT** | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc-reports@hotelsherpasoul.com; sp=none; aspf=r; adkim=r;` | 3600 (1 hour) |

**Explanation of Tags:**
- `v=DMARC1`: Protocol version.
- `p=none`: Policy is strictly **monitor-only**. No emails are blocked or quarantined while verifying alignment.
- `rua=mailto:dmarc-reports@hotelsherpasoul.com`: Aggregated XML feedback reports destination.
- `sp=none`: Subdomain policy set to monitor mode.
- `aspf=r` & `adkim=r`: Relaxed SPF & DKIM alignment allowing subdomains.

---

### Record 2: DKIM Cryptographic Key (Resend Provider)
*Authenticates that outbound emails from `info@hotelsherpasoul.com` were genuinely sent by Hotel Sherpa Soul and were not altered in transit.*

| Type | Host / Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| **CNAME** | `resend._domainkey` | `dkim.resend.com` | 3600 (1 hour) |

*(Note: If using standard TXT key provided in the Resend dashboard, use selector `resend._domainkey` with the generated public key).*

---

### Record 3: SPF (Sender Policy Framework)
*Authorizes transactional mail delivery servers.*

| Type | Host / Name | Value | TTL |
| :--- | :--- | :--- | :--- |
| **TXT** | `@` (or `hotelsherpasoul.com`) | `v=spf1 ip4:202.63.243.186 include:resend.com ~all` | 3600 (1 hour) |

*(If Hotel Sherpa Soul also uses Google Workspace or Microsoft 365 for staff inboxes, include `include:_spf.google.com` or `include:spf.protection.outlook.com` before `~all`).*

---

### Record 4: Inbound MX Routing (For Direct Webhook Ingestion)
*Routes inbound mail sent to `info@hotelsherpasoul.com` directly into Resend Inbound Webhook.*

| Type | Host / Name | Priority | Value | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **MX** | `@` | `10` | `feedback-smtp.resend.com` | 3600 |

*Alternative:* If existing mail host `mail.hotelsherpasoul.com` is retained for staff POP3/IMAP inboxes, configure an email forwarding rule inside the mail server:
- Forward all mail received at `info@hotelsherpasoul.com` -> `inbound@in.hotelsherpasoul.com` (pointing to Resend MX).

---

## 3. Outbound Email Deliverability & Anti-Spam Best Practices

To guarantee that outbound responses from `info@hotelsherpasoul.com` land in guest primary inboxes (not spam/junk):

1. **Authentication Alignment**:
   - Ensure the `From:` header always matches `info@hotelsherpasoul.com` and matches the DKIM domain signature.
2. **Standard Email Headers**:
   - Outbound replies must include standard RFC threading headers:
     - `Message-ID: <...>`
     - `In-Reply-To: <original-message-id>`
     - `References: <original-message-id>`
3. **Clean Content Formatting**:
   - Avoid spam trigger words ("100% FREE", "WINNER", "ACT NOW", excessive exclamation marks, ALL CAPS).
   - Always include the hotel's physical address: `Chaksibari Marg, Thamel, Kathmandu 44600, Nepal`.
   - Maintain a balanced text-to-HTML ratio with responsive styling.
4. **Gradual IP Warming**:
   - When launching new outbound domain authentication, begin by responding to organic guest inquiries before sending higher volumes.
5. **DMARC Progression Plan**:
   - Month 1: `p=none` (Monitor reports, verify 100% DKIM and SPF pass rate).
   - Month 2: `p=quarantine` (Quarantine unauthenticated spoofing attempts).
   - Month 3+: `p=reject` (Complete protection against impersonation).
