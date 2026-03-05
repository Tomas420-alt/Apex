# Technology Choices

> These choices were made during API Discovery and inform the implementation plan.

## Already Configured

### Database: Convex
- **Why**: Already configured in the project, real-time sync, TypeScript-native
- **SDK**: `convex`
- **API Key**: `EXPO_PUBLIC_CONVEX_URL` (configured: yes)
- **Key Features**: Real-time database, serverless functions, scheduling, file storage
- **Docs**: https://docs.convex.dev

### Authentication: Clerk
- **Why**: Already configured, seamless Expo integration, JWT support with Convex
- **SDK**: `@clerk/clerk-expo`
- **API Key**: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (configured: yes)
- **Key Features**: User management, SSO, secure token storage
- **Docs**: https://clerk.com/docs

### Framework: Expo (React Native)
- **Why**: Already configured, cross-platform iOS & Android
- **SDK**: `expo`
- **Key Features**: File-based routing, OTA updates, native APIs
- **Docs**: https://docs.expo.dev

## New Selections

### AI/LLM: OpenAI
- **Why**: Best structured data extraction for bike specs and parts lists. Excellent function calling for maintenance plan generation.
- **SDK**: `openai` (to install)
- **API Key**: `OPENAI_API_KEY` (configured: pending)
- **Key Features**: GPT-4o/4.1, function calling, structured outputs, JSON mode
- **Pricing**: $2.50/1M input tokens, $10/1M output tokens (GPT-4o)
- **Docs**: https://platform.openai.com/docs
- **Signup**: https://platform.openai.com/api-keys

### Push Notifications: Expo Notifications
- **Why**: Built into Expo, zero extra setup, free push notifications
- **SDK**: `expo-notifications` (to install)
- **API Key**: None needed (uses Expo push service)
- **Key Features**: Scheduled notifications, badges, sound, iOS & Android support
- **Pricing**: Free
- **Docs**: https://docs.expo.dev/push-notifications/overview

### SMS: Twilio
- **Why**: Industry standard, most reliable delivery, excellent Convex integration via HTTP actions
- **SDK**: Called via HTTP from Convex actions (no client SDK needed)
- **API Keys**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (configured: pending)
- **Key Features**: Programmable SMS, delivery tracking, global reach
- **Pricing**: ~$0.0079/SMS, free trial with $15 credit
- **Docs**: https://www.twilio.com/docs/sms
- **Signup**: https://console.twilio.com

### Email: Resend
- **Why**: Modern email API, React Email templates, simple SDK, great for transactional emails
- **SDK**: Called via HTTP from Convex actions
- **API Key**: `RESEND_API_KEY` (configured: pending)
- **Key Features**: React Email templates, delivery tracking, 3K emails/month free
- **Pricing**: Free tier: 3K emails/month, then $20/month for 50K
- **Docs**: https://resend.com/docs
- **Signup**: https://resend.com/api-keys

### Parts Shopping: AI-Generated Affiliate Links
- **Why**: No extra API needed, uses OpenAI to identify part numbers and generate search links to suppliers
- **SDK**: None (uses OpenAI + URL generation)
- **API Key**: None (uses OpenAI key)
- **Key Features**: Part number identification, multi-supplier links (RevZilla, Amazon, etc.), monetizable via affiliate programs
- **Pricing**: Included in OpenAI costs

## Environment Variables Summary

| Variable | Service | Status |
|----------|---------|--------|
| `EXPO_PUBLIC_CONVEX_URL` | Convex | Configured |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Configured |
| `CLERK_SECRET_KEY` | Clerk | Configured |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk | Configured |
| `CONVEX_DEPLOYMENT` | Convex | Configured |
| `OPENAI_API_KEY` | OpenAI | Configured |
| `RESEND_API_KEY` | Resend | Configured |
| `TWILIO_ACCOUNT_SID` | Twilio | Configured |
| `TWILIO_AUTH_TOKEN` | Twilio | Configured |
| `TWILIO_PHONE_NUMBER` | Twilio | Configured |

## Packages to Install

```bash
npm install openai expo-notifications
```

> Note: Twilio and Resend are called via HTTP from Convex actions (no client SDK needed).
