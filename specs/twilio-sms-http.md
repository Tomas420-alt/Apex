# Twilio SMS via HTTP

## Overview

Send SMS messages from Convex HTTP actions using Twilio's REST API directly via `fetch` — no SDK required. This approach is ideal for serverless environments like Convex where you want minimal dependencies and full control over HTTP requests. Twilio's Messages API accepts standard `application/x-www-form-urlencoded` POST requests with Basic Auth, making it straightforward to call from any runtime.

## Installation

No packages required. Uses the built-in `fetch` API available in Convex actions and HTTP actions.

## Configuration

### Environment Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `TWILIO_ACCOUNT_SID` | Account identifier (starts with `AC`) | Twilio Console → Account Dashboard |
| `TWILIO_AUTH_TOKEN` | Secret token for authentication | Twilio Console → Account Dashboard |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number in E.164 format (e.g., `+15017122661`) | Twilio Console → Phone Numbers → Manage |

Set these in your Convex dashboard under Settings → Environment Variables, or via CLI:

```bash
npx convex env set TWILIO_ACCOUNT_SID ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
npx convex env set TWILIO_AUTH_TOKEN your_auth_token_here
npx convex env set TWILIO_PHONE_NUMBER +15017122661
```

### E.164 Phone Number Format

All phone numbers must be in E.164 format: `+[country code][number]`
- US example: `+14155552671`
- UK example: `+447911123456`
- No spaces, dashes, or parentheses

## Key Patterns

### Send an SMS Message

The core API call to send an SMS message via Twilio's REST API:

```typescript
// convex/twilio.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendSMS = action({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER!;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const params = new URLSearchParams();
    params.append("To", args.to);
    params.append("From", fromNumber);
    params.append("Body", args.body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Twilio API error ${result.code}: ${result.message}`
      );
    }

    return {
      sid: result.sid,
      status: result.status,
    };
  },
});
```

### Send SMS with Status Callback

Include a `StatusCallback` URL so Twilio notifies you when message status changes:

```typescript
const params = new URLSearchParams();
params.append("To", to);
params.append("From", fromNumber);
params.append("Body", body);
params.append("StatusCallback", "https://your-convex-url.convex.site/twilio-status");

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: params.toString(),
});
```

### Handle Status Callbacks (Convex HTTP Action)

Receive delivery status updates from Twilio via a Convex HTTP endpoint:

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/twilio-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const messageSid = params.get("MessageSid");
    const messageStatus = params.get("MessageStatus");
    const errorCode = params.get("ErrorCode");

    // Store status update in database
    await ctx.runMutation(internal.notifications.updateMessageStatus, {
      messageSid: messageSid!,
      status: messageStatus!,
      errorCode: errorCode ?? undefined,
    });

    // Twilio expects a 200 response
    return new Response(null, { status: 200 });
  }),
});

export default http;
```

### Validate Twilio Webhook Signatures

Verify that incoming webhooks are genuinely from Twilio using HMAC-SHA1 signature validation:

```typescript
import { createHmac } from "crypto";

function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  // 1. Start with the full URL
  let data = url;

  // 2. Sort POST parameters alphabetically and append key+value
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // 3. Sign with HMAC-SHA1 using your auth token
  const hmac = createHmac("sha1", authToken);
  hmac.update(data);
  const computed = hmac.digest("base64");

  // 4. Compare signatures (use timing-safe comparison in production)
  return computed === signature;
}

// Usage in HTTP action:
http.route({
  path: "/twilio-status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const twilioSignature = request.headers.get("X-Twilio-Signature") ?? "";
    const body = await request.text();
    const params = Object.fromEntries(new URLSearchParams(body));

    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const url = "https://your-convex-url.convex.site/twilio-status";

    if (!validateTwilioSignature(authToken, url, params, twilioSignature)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Process the validated webhook...
    return new Response(null, { status: 200 });
  }),
});
```

> **Note**: Twilio strongly recommends using their SDK for signature validation. The manual approach above works but is sensitive to URL encoding, parameter ordering, and other subtle issues. For production, consider installing `twilio` just for validation, or thoroughly test your implementation.

### Schedule an SMS from a Mutation

Use Convex scheduling to send SMS from a mutation context (mutations can't call `fetch` directly):

```typescript
// convex/notifications.ts
import { mutation, action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Internal action that actually sends the SMS
export const sendSMSInternal = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER!;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const params = new URLSearchParams();
    params.append("To", args.to);
    params.append("From", fromNumber);
    params.append("Body", args.body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Twilio error ${error.code}: ${error.message}`);
    }

    return await response.json();
  },
});

// Mutation that schedules the SMS send
export const scheduleReminder = mutation({
  args: {
    to: v.string(),
    body: v.string(),
    delayMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(
      args.delayMs,
      internal.notifications.sendSMSInternal,
      { to: args.to, body: args.body }
    );
  },
});
```

## API Reference

### Create Message Endpoint

```
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
```

**Authentication**: HTTP Basic Auth — `AccountSid:AuthToken`

**Content-Type**: `application/x-www-form-urlencoded`

### Request Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `To` | Yes | Recipient phone number in E.164 format |
| `From` | Yes* | Sender phone number in E.164 format |
| `Body` | Yes** | Text content of the message (max 1600 characters) |
| `MessagingServiceSid` | No* | Use a Messaging Service instead of `From` |
| `StatusCallback` | No | URL for delivery status webhooks |
| `MediaUrl` | No** | URL of media to send (for MMS) |
| `ValidityPeriod` | No | Seconds before message expires (max 14400) |

\* Either `From` or `MessagingServiceSid` is required.
\** Either `Body` or `MediaUrl` is required.

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `sid` | string | Unique message identifier (starts with `SM`) |
| `status` | string | Current message status |
| `date_created` | string | RFC 2822 timestamp |
| `date_sent` | string | RFC 2822 timestamp (null if queued) |
| `num_segments` | string | Number of SMS segments |
| `price` | string | Cost (populated after delivery) |
| `error_code` | number | Error code if failed |
| `error_message` | string | Error description if failed |

### Message Status Values

| Status | Description |
|--------|-------------|
| `accepted` | Request received by Twilio |
| `queued` | Message queued for sending |
| `sending` | Being dispatched to carrier |
| `sent` | Accepted by carrier |
| `delivered` | Confirmed delivered to recipient |
| `failed` | Could not be sent |
| `undelivered` | Delivered to carrier but not to recipient |
| `canceled` | Scheduled message was canceled |
| `read` | Recipient read the message (WhatsApp/RCS only) |

### Status Callback Parameters

Twilio sends these parameters to your `StatusCallback` URL via POST (`application/x-www-form-urlencoded`):

| Parameter | Description |
|-----------|-------------|
| `MessageSid` | Unique message identifier |
| `MessageStatus` | Current status (see table above) |
| `AccountSid` | Your Twilio account SID |
| `From` | Sender phone number |
| `To` | Recipient phone number |
| `ErrorCode` | Error code (only if failed/undelivered) |
| `RawDlrDoneDate` | Carrier delivery timestamp |

## Gotchas

1. **Phone numbers must be E.164 format** — Always include the `+` prefix and country code. No spaces, dashes, or parentheses. Error `21211` means invalid format.

2. **Trial accounts can only send to verified numbers** — On a free Twilio account, you must verify recipient numbers in the console first. Error `21608` means the number isn't verified.

3. **Status callbacks may arrive out of order** — Due to network latency, a `delivered` callback could arrive before `sent`. Design your logic to handle non-sequential status updates.

4. **Signature validation is URL-sensitive** — The exact URL (including protocol, port, and path) must match what Twilio used. SSL termination proxies or URL rewrites will break validation.

5. **Body must be URL-encoded** — When using `URLSearchParams`, this is handled automatically. If constructing the body manually, ensure proper encoding.

6. **Messages are billed even if undelivered** — Starting September 2024, Twilio charges for failed messages. Validate numbers before sending when possible.

7. **btoa() for Basic Auth** — In Convex (Node.js-compatible runtime), `btoa()` is available for Base64 encoding. If not, use `Buffer.from(\`${sid}:${token}\`).toString("base64")`.

8. **Content-Type header is required** — The API expects `application/x-www-form-urlencoded`. Omitting this header will cause a `400 Bad Request`.

9. **Opt-out compliance (error 21610)** — If a recipient texts STOP to your number, Twilio automatically blocks further messages. You'll get error `21610` for blacklisted recipients.

10. **Convex actions vs mutations** — You can only make `fetch` calls from Convex `action` or `httpAction` handlers, not from `mutation` or `query` handlers. Use `ctx.scheduler` to bridge from mutations to actions.

## Rate Limits

| Number Type | Default Throughput | Notes |
|-------------|-------------------|-------|
| Long code (10DLC) | 1 MPS | Standard US local numbers |
| Toll-free | ~3 MPS | After toll-free verification |
| Short code | 100 MPS | Dedicated short codes |

- **Account-level throughput** is pooled across all numbers and based on your historical peak usage
- Messages exceeding your MPS are **queued for up to 10 hours** before being dropped
- There is a **30-message limit between two specific numbers in 30 seconds**
- For higher throughput, use a Messaging Service with multiple numbers

## Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `21211` | Invalid 'To' phone number | Ensure E.164 format |
| `21408` | Permission not enabled for region | Enable geo permissions in console |
| `21608` | Unverified number (trial accounts) | Verify number in Twilio console |
| `21610` | Recipient opted out (STOP) | Respect opt-out; cannot override |
| `21612` | 'From' number not valid for SMS | Check number has SMS capability |
| `14107` | SMS send rate limit exceeded | Reduce send rate or upgrade throughput |
| `30001` | Queue overflow | Messages queued too long; reduce volume |
| `30003` | Unreachable destination | Recipient device off or out of range |
| `30005` | Unknown destination | Number doesn't exist |
| `30006` | Landline or unreachable carrier | Can't send SMS to landlines |
| `30007` | Message filtered by carrier | Content flagged as spam |

## References

- [Messages Resource API](https://www.twilio.com/docs/messaging/api/message-resource) — Create, fetch, and manage messages
- [Twilio API Overview](https://www.twilio.com/docs/usage/api) — Authentication, requests, and SDKs
- [Making Requests to Twilio](https://www.twilio.com/docs/usage/requests-to-twilio) — HTTP methods, auth, and content types
- [Track Outbound Message Status](https://www.twilio.com/docs/messaging/guides/track-outbound-message-status) — StatusCallback setup and usage
- [Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security) — Signature validation
- [Account Based Throughput](https://www.twilio.com/docs/messaging/guides/account-based-throughput-overview) — Rate limits and queuing
- [Error and Warning Dictionary](https://www.twilio.com/docs/api/errors) — Full error code reference
- [SMS Quickstart](https://www.twilio.com/docs/messaging/quickstart) — Getting started guide
