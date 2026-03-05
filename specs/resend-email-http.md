# Resend Email REST API Specification

## Overview

Resend is an email service built for developers that provides a clean REST API for sending transactional and marketing emails. It supports real-time delivery tracking via webhooks, HTML email templates, batch sending, and scheduled delivery.

**Base URL:** `https://api.resend.com`

---

## 1. Authentication

All API requests require a Bearer token in the `Authorization` header. API keys are generated in the Resend dashboard and begin with the prefix `re_`.

```
Authorization: Bearer re_YOUR_API_KEY
```

API keys are scoped to a team. The rate limit (2 req/s) applies per team across all API keys.

---

## 2. Sending Emails

### 2.1 Send a Single Email

**Endpoint:** `POST https://api.resend.com/emails`

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer re_YOUR_API_KEY` |
| `Content-Type` | Yes | `application/json` |
| `Idempotency-Key` | No | Unique string to prevent duplicate sends. Max 256 characters, expires after 24 hours. |

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | `string` | Yes | Sender email address. Supports format `"Name <email@domain.com>"` |
| `to` | `string \| string[]` | Yes | Recipient email address(es). Maximum 50 addresses. |
| `subject` | `string` | Yes | Email subject line. |
| `html` | `string` | No | HTML body of the email. |
| `text` | `string` | No | Plain text body. Auto-generated from `html` if omitted. |
| `cc` | `string \| string[]` | No | Carbon copy recipient(s). |
| `bcc` | `string \| string[]` | No | Blind carbon copy recipient(s). |
| `reply_to` | `string \| string[]` | No | Reply-to address(es). |
| `headers` | `object` | No | Custom email headers as key-value pairs. |
| `attachments` | `array` | No | File attachments. Each object has: `content` (base64 string), `filename`, `path` (URL), `content_type`, `content_id`. |
| `tags` | `array` | No | Metadata key-value pairs. Each object has `name` and `value` fields. |
| `template` | `object` | No | Template configuration with `id` (string) and `variables` (object). |
| `topic_id` | `string` | No | Topic subscription identifier for unsubscribe management. |
| `scheduled_at` | `string` | No | Schedule delivery time in ISO 8601 format or natural language. |

#### Successful Response

**Status Code:** `200 OK`

```json
{
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"
}
```

The `id` field is the unique email identifier used to track the email via the Retrieve Email endpoint or webhooks.

#### cURL Example

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Your App <noreply@yourdomain.com>",
    "to": ["user@example.com"],
    "subject": "Welcome to Our App",
    "html": "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
    "text": "Welcome! Thanks for signing up.",
    "reply_to": "support@yourdomain.com",
    "tags": [
      { "name": "category", "value": "onboarding" }
    ]
  }'
```

#### cURL Example with Attachments

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Your App <noreply@yourdomain.com>",
    "to": "user@example.com",
    "subject": "Your Invoice",
    "html": "<p>Please find your invoice attached.</p>",
    "attachments": [
      {
        "filename": "invoice.pdf",
        "path": "https://example.com/invoices/123.pdf"
      }
    ]
  }'
```

#### cURL Example with Idempotency Key

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: unique-request-id-abc123' \
  -d '{
    "from": "noreply@yourdomain.com",
    "to": "user@example.com",
    "subject": "Order Confirmation",
    "html": "<p>Your order has been confirmed.</p>"
  }'
```

#### cURL Example with Template

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Your App <noreply@yourdomain.com>",
    "to": "user@example.com",
    "subject": "Your Weekly Summary",
    "template": {
      "id": "tmpl_abc123",
      "variables": {
        "user_name": "John",
        "summary_count": "5"
      }
    }
  }'
```

**Note on templates:** When sending with a template, the payload values for `from`, `subject`, and `reply_to` take precedence over the template's defaults. If the template does not define defaults for these fields, you must provide them in the request payload.

### 2.2 Send Batch Emails

**Endpoint:** `POST https://api.resend.com/emails/batch`

Send up to **100 emails** in a single API call. Each individual email supports up to 50 recipients.

#### Request Body

An array of email objects, each with the same parameters as the single send endpoint (except `attachments` and `scheduled_at`, which are **not supported** in batch requests).

```bash
curl -X POST 'https://api.resend.com/emails/batch' \
  -H 'Authorization: Bearer re_YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '[
    {
      "from": "noreply@yourdomain.com",
      "to": "user1@example.com",
      "subject": "Welcome User 1",
      "html": "<p>Welcome, User 1!</p>"
    },
    {
      "from": "noreply@yourdomain.com",
      "to": "user2@example.com",
      "subject": "Welcome User 2",
      "html": "<p>Welcome, User 2!</p>"
    }
  ]'
```

#### Successful Response

**Status Code:** `200 OK`

```json
{
  "data": [
    { "id": "ae2014de-c168-4c61-8267-70d2662a1ce1" },
    { "id": "faccb7a5-8a28-4e9a-ac64-8da1cc3bc1cb" }
  ]
}
```

### 2.3 Retrieve Email Status

**Endpoint:** `GET https://api.resend.com/emails/{id}`

Use the email `id` from the send response to check delivery status.

```bash
curl -X GET 'https://api.resend.com/emails/49a3999c-0ce1-4ea6-ab68-afcd6dc2e794' \
  -H 'Authorization: Bearer re_YOUR_API_KEY'
```

#### Response Body

```json
{
  "object": "email",
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
  "to": ["user@example.com"],
  "from": "Your App <noreply@yourdomain.com>",
  "created_at": "2024-01-15T10:30:00.000Z",
  "subject": "Welcome to Our App",
  "html": "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
  "text": "Welcome! Thanks for signing up.",
  "bcc": [],
  "cc": [],
  "reply_to": ["support@yourdomain.com"],
  "last_event": "delivered",
  "scheduled_at": null,
  "tags": [
    { "name": "category", "value": "onboarding" }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `object` | `string` | Always `"email"` |
| `id` | `string` | Unique email identifier |
| `to` | `string[]` | Recipient email addresses |
| `from` | `string` | Sender email address |
| `created_at` | `string` | ISO 8601 creation timestamp |
| `subject` | `string` | Email subject line |
| `html` | `string \| null` | HTML content |
| `text` | `string \| null` | Plain text content |
| `bcc` | `string[]` | BCC recipients |
| `cc` | `string[]` | CC recipients |
| `reply_to` | `string[]` | Reply-to addresses |
| `last_event` | `string` | Most recent delivery event (e.g., `"sent"`, `"delivered"`, `"bounced"`) |
| `scheduled_at` | `string \| null` | Scheduled delivery time |
| `tags` | `array` | Array of `{ name, value }` objects |

---

## 3. HTML Email Templates

### 3.1 Inline HTML

Pass HTML directly in the `html` field of the request body:

```json
{
  "from": "noreply@yourdomain.com",
  "to": "user@example.com",
  "subject": "Password Reset",
  "html": "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head><body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'><h1 style='color: #1F2937;'>Password Reset</h1><p style='color: #4B5563; line-height: 1.6;'>Click the button below to reset your password:</p><a href='https://yourapp.com/reset?token=abc123' style='display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;'>Reset Password</a><p style='color: #9CA3AF; font-size: 12px; margin-top: 32px;'>If you did not request this, ignore this email.</p></body></html>"
}
```

### 3.2 Using Resend Templates

Create templates in the Resend dashboard, then reference them by ID with dynamic variables:

```json
{
  "from": "noreply@yourdomain.com",
  "to": "user@example.com",
  "subject": "Your Order Confirmation",
  "template": {
    "id": "tmpl_abc123def456",
    "variables": {
      "customer_name": "Jane Doe",
      "order_id": "ORD-2024-001",
      "total": "$49.99"
    }
  }
}
```

### 3.3 HTML Email Template Best Practices

- Use **inline CSS** styles (many email clients strip `<style>` blocks).
- Set `max-width: 600px` on the body/container for readability across clients.
- Include a plain text version via the `text` field for accessibility and spam score.
- Use `<table>` layouts for complex structures to maximize email client compatibility.
- Always include `meta charset='utf-8'` and `meta viewport` tags.
- Test across clients (Gmail, Outlook, Apple Mail) as rendering varies significantly.

### 3.4 Example: Transactional Email Template (Inline HTML)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 24px; text-align: center; background-color: #1F2937;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Your App Name</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 32px 24px;">
        <h2 style="color: #1F2937; margin: 0 0 16px;">Hello {{user_name}},</h2>
        <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px;">
          Your action has been completed successfully.
        </p>
        <a href="{{action_url}}"
           style="display: inline-block; background-color: #10B981; color: #ffffff;
                  padding: 12px 32px; text-decoration: none; border-radius: 6px;
                  font-weight: 600;">
          View Details
        </a>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
          You received this email because you have an account with Your App Name.
          <br>
          <a href="{{unsubscribe_url}}" style="color: #9CA3AF;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Delivery Tracking Webhooks

### 4.1 Overview

Resend uses webhooks (powered by Svix) to send real-time HTTPS POST requests to your application when email events occur. Webhooks deliver JSON payloads and provide **at-least-once delivery**, meaning events may arrive multiple times or out of order.

### 4.2 Webhook Event Types

#### Email Events (11 types)

| Event | Description |
|-------|-------------|
| `email.sent` | API request was successful. Resend will attempt delivery. |
| `email.delivered` | Email successfully delivered to the recipient's mail server. |
| `email.delivery_delayed` | Temporary delivery issue (e.g., full inbox, transient server problem). |
| `email.bounced` | Recipient's mail server permanently rejected the email. |
| `email.complained` | Recipient marked the email as spam. |
| `email.opened` | Recipient opened the email (requires tracking enabled). |
| `email.clicked` | Recipient clicked a link in the email (requires tracking enabled). |
| `email.failed` | Sending failed (invalid recipient, API key issue, domain not verified, quota exceeded). |
| `email.received` | Resend successfully received an inbound email. |
| `email.scheduled` | Email was scheduled for future delivery. |
| `email.suppressed` | Email was suppressed by Resend (e.g., previous hard bounce on this address). |

#### Domain Events (3 types)

| Event | Description |
|-------|-------------|
| `domain.created` | Domain was successfully created. |
| `domain.updated` | Domain was successfully updated. |
| `domain.deleted` | Domain was successfully deleted. |

#### Contact Events (3 types)

| Event | Description |
|-------|-------------|
| `contact.created` | Contact was successfully created (not triggered during CSV bulk imports). |
| `contact.updated` | Contact was successfully updated. |
| `contact.deleted` | Contact was successfully deleted. |

### 4.3 Webhook Payload Format

Each webhook event is connected to a single `to` recipient. Example payload for `email.bounced`:

```json
{
  "type": "email.bounced",
  "created_at": "2024-01-15T10:35:22.000Z",
  "data": {
    "email_id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
    "from": "noreply@yourdomain.com",
    "to": ["user@example.com"],
    "subject": "Welcome to Our App",
    "bounce": {
      "message": "550 5.1.1 The email account does not exist",
      "subType": "permanent",
      "type": "hard"
    },
    "tags": [
      { "name": "category", "value": "onboarding" }
    ]
  }
}
```

Example payload for `email.delivered`:

```json
{
  "type": "email.delivered",
  "created_at": "2024-01-15T10:30:05.000Z",
  "data": {
    "email_id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
    "from": "noreply@yourdomain.com",
    "to": ["user@example.com"],
    "subject": "Welcome to Our App",
    "tags": [
      { "name": "category", "value": "onboarding" }
    ]
  }
}
```

### 4.4 Webhook Headers

Each webhook request includes these headers for verification:

| Header | Description |
|--------|-------------|
| `svix-id` | Unique identifier for this webhook message delivery. |
| `svix-timestamp` | Timestamp in seconds since epoch. |
| `svix-signature` | Base64 encoded HMAC-SHA256 signature(s), space delimited, prefixed with `v1,`. |

### 4.5 Webhook Signature Verification

Resend uses Svix for webhook delivery. You must verify signatures to ensure requests are authentic.

#### Using the Resend SDK (recommended)

```javascript
import { Resend } from 'resend';

const resend = new Resend('re_YOUR_API_KEY');

export async function POST(req) {
  try {
    const payload = await req.text();

    const event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get('svix-id'),
        timestamp: req.headers.get('svix-timestamp'),
        signature: req.headers.get('svix-signature'),
      },
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    });

    // Process the verified event
    console.log('Verified event:', event.type);

    return new Response('OK', { status: 200 });
  } catch (error) {
    return new Response('Invalid webhook signature', { status: 400 });
  }
}
```

#### Using the Svix Library Directly

```javascript
import { Webhook } from 'svix';

const secret = process.env.RESEND_WEBHOOK_SECRET; // starts with "whsec_"

export async function POST(req) {
  const payload = await req.text(); // MUST be raw body, not parsed JSON
  const headers = {
    'svix-id': req.headers.get('svix-id'),
    'svix-timestamp': req.headers.get('svix-timestamp'),
    'svix-signature': req.headers.get('svix-signature'),
  };

  const wh = new Webhook(secret);

  try {
    const event = wh.verify(payload, headers);
    // Process the event
    return new Response('OK', { status: 200 });
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }
}
```

#### Manual Verification

The signed content is constructed as:

```
signed_content = "${svix_id}.${svix_timestamp}.${raw_body}"
```

Compute an HMAC-SHA256 using the base64-decoded portion of your signing secret (the part after the `whsec_` prefix) as the key. The result should match the signature in the `svix-signature` header (after the `v1,` prefix).

**Critical:** Always use the raw request body string for verification. Parsing JSON and re-stringifying it will break the signature due to whitespace and key ordering differences.

### 4.6 Webhook Retry Schedule

If your endpoint does not return a `200` response, Resend retries on this schedule:

1. **5 seconds** after initial failure
2. **5 minutes** after attempt 2
3. **30 minutes** after attempt 3
4. **2 hours** after attempt 4
5. **5 hours** after attempt 5
6. **10 hours** after attempt 6

After all retries are exhausted, the webhook is dropped. Manual retry is available in the Resend dashboard.

### 4.7 Webhook Source IPs

If you need to whitelist webhook traffic, these are the source IPs:

- `44.228.126.217`
- `50.112.21.217`
- `52.24.126.164`
- `54.148.139.208`
- `2600:1f24:64:8000::/52` (IPv6 range)

### 4.8 Deduplication

Use the `svix-id` header to deduplicate events. Store processed IDs and skip any duplicates, since at-least-once delivery means events may arrive more than once.

### 4.9 Ordering

Events may arrive out of order. Use the `created_at` timestamp in the payload to establish correct chronological ordering.

---

## 5. Rate Limits and Quotas

### 5.1 API Rate Limit

| Limit | Value |
|-------|-------|
| **Default rate limit** | **2 requests per second per team** |
| **Scope** | Per team (not per API key or per domain) |
| **Increase** | Contact Resend support for higher limits on sustained workloads |

### 5.2 Rate Limit Response Headers

Every API response includes these headers:

| Header | Description |
|--------|-------------|
| `ratelimit-limit` | Maximum number of requests allowed within the current window. |
| `ratelimit-remaining` | Number of requests remaining in the current window. |
| `ratelimit-reset` | Seconds until the rate limit resets. |
| `retry-after` | Seconds to wait before making the next request (present on 429 responses). |

### 5.3 Email Quota Headers

| Header | Description |
|--------|-------------|
| `x-resend-daily-quota` | Daily email usage (free plan only). |
| `x-resend-monthly-quota` | Monthly email usage tracking. |

### 5.4 Quotas by Plan

| Plan | Price | Daily Limit | Monthly Limit | Domains | Rate Limit |
|------|-------|-------------|---------------|---------|------------|
| **Free** | $0 | 100 emails/day | 3,000 emails/month | 1 | 2 req/s |
| **Pro** | $20/month | No daily limit | 50,000 emails/month | Unlimited | 2 req/s |
| **Scale** | $90/month | No daily limit | 100,000 emails/month | Unlimited | 2 req/s |
| **Enterprise** | Custom | No daily limit | Custom | Unlimited | Custom |

**Important notes:**
- Both **sent and received (inbound) emails** count toward your quota.
- Overage protection: By default, overage usage is capped at **5x your plan's monthly quota**.
- Batch Email API supports up to **100 emails per single request**.

### 5.5 Deliverability Requirements

| Metric | Maximum Allowed |
|--------|-----------------|
| **Bounce rate** | Under 4% |
| **Spam complaint rate** | Under 0.08% |

Exceeding these thresholds may result in account restrictions.

### 5.6 Error Responses for Quota/Rate Limit Violations

**HTTP Status:** `429 Too Many Requests`

Rate limit exceeded:
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "name": "rate_limit_exceeded"
}
```

Daily quota exceeded (free plan):
```json
{
  "statusCode": 429,
  "message": "You have reached your daily email sending quota",
  "name": "daily_quota_exceeded"
}
```

Monthly quota exceeded:
```json
{
  "statusCode": 429,
  "message": "You have reached your monthly email sending quota",
  "name": "monthly_quota_exceeded"
}
```

---

## 6. Gotchas and Best Practices

### 6.1 Common Pitfalls

1. **Domain verification required.** You must verify your sending domain via DNS records (SPF, DKIM, DMARC) before sending from it. The `onboarding@resend.dev` address works for testing without verification.

2. **Raw body for webhook verification.** Never parse the webhook body as JSON before verifying the signature. The cryptographic signature is sensitive to any change in the payload string.

3. **Batch limitations.** The batch endpoint does not support `attachments` or `scheduled_at`. Use individual send requests for those features.

4. **Idempotency keys expire after 24 hours.** Do not reuse idempotency keys for different email content after 24 hours.

5. **Rate limit is per team.** All API keys under a team share the 2 req/s limit. Plan accordingly if you have multiple services sending emails.

6. **At-least-once webhook delivery.** Always implement deduplication using `svix-id`. Never assume exactly-once delivery.

7. **50 recipient limit per email.** The `to` field accepts a maximum of 50 addresses. For larger lists, use the batch endpoint or multiple requests.

### 6.2 Best Practices

1. **Always set an `Idempotency-Key`** for critical transactional emails (order confirmations, password resets) to prevent duplicate sends during retries.

2. **Include both `html` and `text`** versions of your email. This improves deliverability and accessibility.

3. **Use tags** to categorize emails (`{ "name": "type", "value": "welcome" }`) for easier filtering and analytics.

4. **Monitor bounce and complaint rates** via webhooks. Automatically remove hard-bounced addresses from your mailing lists to stay under the 4% bounce / 0.08% complaint thresholds.

5. **Implement exponential backoff** when you receive a `429` response. Use the `retry-after` header to determine wait time.

6. **Use `reply_to`** instead of setting the `from` address to a user-facing mailbox. This keeps your sending domain consistent.

7. **Implement the `email.suppressed` webhook** to detect when Resend automatically blocks delivery to previously bounced addresses.

8. **Use the Retrieve Email endpoint** (`GET /emails/{id}`) to check `last_event` for email status polling as a complement to webhooks.

---

## 7. Quick Reference: All Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/emails` | Send a single email |
| `POST` | `/emails/batch` | Send up to 100 emails in one request |
| `GET` | `/emails/{id}` | Retrieve email details and status |

---

## 8. Integration Example: Full Send + Track Flow

```javascript
// 1. Send an email
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer re_YOUR_API_KEY',
    'Content-Type': 'application/json',
    'Idempotency-Key': `welcome-${userId}-${Date.now()}`,
  },
  body: JSON.stringify({
    from: 'Your App <noreply@yourdomain.com>',
    to: userEmail,
    subject: 'Welcome!',
    html: '<h1>Welcome to the app!</h1>',
    text: 'Welcome to the app!',
    tags: [
      { name: 'type', value: 'welcome' },
      { name: 'user_id', value: userId },
    ],
  }),
});

const { id } = await response.json();
console.log('Email queued with ID:', id);

// 2. Poll for status (alternative to webhooks)
const statusResponse = await fetch(`https://api.resend.com/emails/${id}`, {
  headers: { 'Authorization': 'Bearer re_YOUR_API_KEY' },
});
const emailData = await statusResponse.json();
console.log('Last event:', emailData.last_event);

// 3. Handle webhook events (on your server)
// POST /api/webhooks/resend
export async function handleWebhook(req) {
  const payload = await req.text();
  const event = resend.webhooks.verify({
    payload,
    headers: {
      id: req.headers.get('svix-id'),
      timestamp: req.headers.get('svix-timestamp'),
      signature: req.headers.get('svix-signature'),
    },
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
  });

  switch (event.type) {
    case 'email.delivered':
      console.log('Email delivered to', event.data.to);
      break;
    case 'email.bounced':
      console.log('Email bounced:', event.data.bounce.message);
      // Remove bounced address from mailing list
      break;
    case 'email.complained':
      console.log('Spam complaint from', event.data.to);
      // Unsubscribe the user
      break;
    case 'email.opened':
      console.log('Email opened by', event.data.to);
      break;
    case 'email.clicked':
      console.log('Link clicked by', event.data.to);
      break;
  }

  return new Response('OK', { status: 200 });
}
```

---

## Sources

- [Resend Send Email API Reference](https://resend.com/docs/api-reference/emails/send-email)
- [Resend Retrieve Email API Reference](https://resend.com/docs/api-reference/emails/retrieve-email)
- [Resend Batch Emails API Reference](https://resend.com/docs/api-reference/emails/send-batch-emails)
- [Resend Rate Limits Documentation](https://resend.com/docs/api-reference/rate-limit)
- [Resend Webhook Introduction](https://resend.com/docs/dashboard/webhooks/introduction)
- [Resend Webhook Event Types](https://resend.com/docs/dashboard/webhooks/event-types)
- [Resend Webhook Verification](https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests)
- [Resend Account Quotas and Limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
- [Resend cURL Example (GitHub)](https://github.com/resend/resend-curl-example)
- [Resend Pricing](https://resend.com/pricing)
