# Security Hardening Plan

## 1. Remove Test/Debug Code (CRITICAL)

- [x] **1a.** Remove test onboarding + subscription toggle buttons from `app/(tabs)/index.tsx`
- [x] **1b.** Remove TEMP `triggerHeroGen` mutation from `convex/bikes.ts` and its usage in `app/(tabs)/pilot.tsx`
- [x] **1c.** Guard `resetForInspection` in `convex/inspectionMutations.ts` — changed to `internalMutation`
- [x] **1d.** `resetSubscription` and `deleteByEmail` in `convex/users.ts` — verified as `internalMutation`

## 2. Subscription Receipt Validation (CRITICAL)

- [x] **2a.** `updateSubscription` mutation now rejects `subscriptionStatus: "active"` from clients
- [x] **2b.** Created `activateSubscription` as `internalMutation` — only server code can activate Pro
- [x] **2c.** Created `convex/subscriptions.ts` with `validateAndActivateSubscription` action — gateway for activation
- [x] **2d.** `useRevenueCat.ts` updated to use the action for activation, mutation for expiry only
- [x] **2e.** RevenueCat webhook endpoint at `POST /webhooks/revenuecat` in `convex/webhooks.ts` — handles INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE events
- [x] **2f.** Webhook authenticates via `REVENUECAT_WEBHOOK_SECRET` env var in Authorization header
- [x] **2g.** `updateSubscriptionInternal` internal mutation added for webhook deactivation events
- [x] **2h.** `useRevenueCat` hook calls `Purchases.logIn(convexUserId)` to link RevenueCat customer to Convex user
- [ ] **2i.** TODO: Set `REVENUECAT_WEBHOOK_SECRET` env var and configure webhook URL in RevenueCat dashboard

## 3. Input Validation & Sanitization (HIGH)

- [x] **3a.** String length limits on all mutations: make (50), model (50), name (200), description (1000), notes (1000), phone (20), country (50)
- [x] **3b.** Numeric bounds: year (1900-2100), mileage (0-999999), annualMileage (0-999999), intervalMonths (0-120)
- [x] **3c.** Enum validation: subscriptionStatus, subscriptionPlan, priority

## 4. Rate Limiting (HIGH)

- [x] **4a.** Rate limiting on AI operations: hero image (5/hr), maintenance plan (5/hr), parts gen, inspection checklist (5/hr)
- [x] **4b.** Rate limiting on bike creation (10/hr)
- [x] **4c.** Friendly error message: "Rate limit exceeded. Please try again later."
- [x] **4d.** `rateLimits` table added to schema with `by_user_action` index

## 5. Error Message Sanitization (MEDIUM)

- [x] **5a.** `convex/notifications.ts` — removed env var names, user IDs from all error messages
- [x] **5b.** Auth error messages in `sign-in.tsx` and `sign-up.tsx` show friendly messages, not stack traces
- [x] **5c.** All 24 client-side `console.error` calls wrapped in `if (__DEV__)` across 11 files

## 6. Secure Token Storage & Data at Rest (MEDIUM)

- [x] **6a.** Token storage uses `expo-secure-store` on native (Keychain on iOS, EncryptedSharedPreferences on Android) — verified in `app/providers/AuthProvider.tsx`
- [x] **6b.** No `AsyncStorage`, `MMKV`, or `localStorage` usage found for sensitive data — PASS
- [x] **6c.** No PII, tokens, or subscription data stored in unencrypted local storage — PASS
- [x] **6d.** RevenueCat SDK handles its own secure token storage internally — PASS
- [x] **6e.** Only `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_` prefix, designed for client) in client code — verified

## 7. Transport Security & Certificate Pinning (MEDIUM)

- [x] **7a.** ATS enforced: `NSAllowsArbitraryLoads` is `false` in `ios/ApexTune/Info.plist` — only `NSAllowsLocalNetworking` for dev
- [x] **7b.** Android: only `https` scheme declared in `AndroidManifest.xml` — no unencrypted traffic
- [x] **7c.** All API calls verified HTTPS: Convex, Twilio (`https://api.twilio.com`), Resend (`https://api.resend.com`), OpenAI
- [x] **7d.** Convex URL validated: `convexUrl.startsWith("https://")` in `AuthProvider.tsx`
- [x] **7e.** Certificate pinning: NOT supported in Expo without custom native modules. Documented as limitation. Mitigated by ATS (TLS 1.2+ with strongest ciphers) and HTTPS-only policy.

## 8. Sensitive Data Exposure (MEDIUM)

- [x] **8a.** All 24 unprotected `console.error()` calls in client code wrapped in `__DEV__` guards
- [x] **8b.** Server-side error messages sanitized (no env var names, user IDs, internal paths)
- [x] **8c.** Auth screens show friendly error messages, not raw Convex errors
- [x] **8d.** AI response logs reduced from 2000 to 200 char truncation
- [x] **8e.** Production builds will not output any console.error statements

Files fixed: `app/bike/[id].tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/pilot.tsx`, `app/(tabs)/plan.tsx`, `app/service-history.tsx`, `app/add-task.tsx`, `app/add-bike.tsx`, `app/parts/bike/[id].tsx`, `app/parts/[id].tsx`, `app/onboarding/bike-photo.tsx`, `components/InspectionChecklist.tsx`

## 9. Deep Link / URL Scheme Validation (LOW)

- [x] **9a.** App uses `myapp` URL scheme configured in `app.json`
- [x] **9b.** Expo Router handles all routing via file-based system — no custom URL parsing or `Linking.addEventListener` handlers
- [x] **9c.** All navigation uses `router.push()` with hardcoded paths — no user-controlled URL injection points
- [x] **9d.** Only external URL opens are `Linking.openURL()` for affiliate retailer links — URLs sourced from Convex backend, not user input
- [x] **9e.** No universal links or associated domains configured — attack surface minimal

## 10. Dependency Audit (LOW)

- [x] **10a.** `npm audit`: 3 high-severity vulnerabilities found (flatted, tar, undici) — all fixed via `npm audit fix`, now 0 vulnerabilities
- [x] **10b.** `npx expo-doctor`: 2 warnings — native config sync (expected for prebuild project) and 3 minor patch version mismatches (expo, expo-font, expo-router) — non-security, fixable with `npx expo install --check`

## 11. API Billing Caps (ADVISORY)

- [x] **11a.** Recommended caps documented:
  - **OpenAI**: $50/mo hard cap (set at platform.openai.com → Billing → Limits)
  - **Twilio**: $20/mo (set at twilio.com → Account → Billing)
  - **Resend**: $10/mo (set at resend.com → Billing)
- [x] **11b.** AI image generation costs ~$0.04-0.08 per hero image. Rate limited to 5/hr/user. At 1000 users, worst case ~$80/mo.

## 12. Jailbreak/Tamper Detection (LOW)

- [x] **12a.** Expo does not support native jailbreak detection without custom native modules or ejecting
- [x] **12b.** Documented as post-launch enhancement. Practical risk is low for a motorcycle maintenance app — subscription validation is the primary concern (addressed in section 2)
- [x] **12c.** Future option: `expo-local-authentication` for biometric gating on sensitive actions

## 13. Data at Rest (LOW)

- [x] **13a.** Full audit complete — no `AsyncStorage`, `MMKV`, `localStorage`, or `expo-file-system` writes of sensitive data found
- [x] **13b.** All auth tokens stored via `expo-secure-store` (iOS Keychain / Android EncryptedSharedPreferences)
- [x] **13c.** RevenueCat customer info held in React state only (not persisted to disk by app code — SDK handles its own secure persistence)
- [x] **13d.** No PII written to unencrypted storage

---

## Summary of All Changes Made

### Files Modified (Security):
| File | Changes |
|------|---------|
| `app/(tabs)/index.tsx` | Removed test buttons, subscription toggle; wrapped 3 console.error in `__DEV__` |
| `app/(tabs)/pilot.tsx` | Removed TEMP triggerHeroGen; wrapped 4 console.error in `__DEV__` |
| `app/(tabs)/plan.tsx` | Wrapped 3 console.error in `__DEV__` |
| `app/(auth)/sign-in.tsx` | Friendly error messages, `__DEV__` wrapped logging |
| `app/(auth)/sign-up.tsx` | Friendly error messages, `__DEV__` wrapped logging |
| `app/bike/[id].tsx` | Wrapped 2 console.error in `__DEV__` |
| `app/service-history.tsx` | Wrapped 2 console.error in `__DEV__` |
| `app/add-task.tsx` | Wrapped 1 console.error in `__DEV__` |
| `app/add-bike.tsx` | Wrapped 2 console.error in `__DEV__` |
| `app/parts/[id].tsx` | Wrapped 2 console.error in `__DEV__` |
| `app/parts/bike/[id].tsx` | Wrapped 1 console.error in `__DEV__` |
| `app/onboarding/bike-photo.tsx` | Wrapped 1 console.error in `__DEV__` |
| `app/onboarding/index.tsx` | Wrapped locale detection log in `__DEV__` |
| `components/InspectionChecklist.tsx` | Wrapped 3 console.error in `__DEV__` |
| `hooks/useRevenueCat.ts` | Uses action for activation, wrapped errors in `__DEV__` |
| `convex/bikes.ts` | Removed triggerHeroGen, added input validation + rate limiting on `add` |
| `convex/users.ts` | `updateSubscription` blocks "active" from clients, input validation |
| `convex/onboarding.ts` | Input validation with string trimming and length/bounds checks |
| `convex/maintenanceTasks.ts` | Input validation on `addManual` |
| `convex/inspectionMutations.ts` | `resetForInspection` changed to `internalMutation` |
| `convex/notifications.ts` | Sanitized all error messages |
| `convex/ai.ts` | Rate limiting on generateHeroImage and generateMaintenancePlan |
| `convex/inspection.ts` | Rate limiting on generateChecklist |
| `convex/schema.ts` | Added `rateLimits` table |
| `package-lock.json` | `npm audit fix` — patched flatted, tar, undici |

### Files Created:
| File | Purpose |
|------|---------|
| `convex/rateLimit.ts` | Rate limiting helpers (checkRateLimit, recordAction, cleanupOldEntries) |
| `convex/subscriptions.ts` | Server-side subscription activation action |
| `SECURITY_HARDENING_PLAN.md` | This document |

---

## Remaining Attack Surfaces & Risk Assessment

### Moderate Risk:
1. **RevenueCat server-side receipt validation** — `convex/subscriptions.ts` has a TODO for calling RevenueCat REST API to verify purchase receipts. Currently trusts the client's RevenueCat SDK entitlement check. The `updateSubscription` mutation blocks "active" from clients, and the action is the only activation path. **Recommendation: Implement RevenueCat webhook before launch.**

2. **Rate limit table cleanup** — Old entries accumulate. `cleanupOldEntries` exists but isn't scheduled. **Recommendation: Add cron job to prune entries older than 24 hours.**

### Low Risk:
3. **No certificate pinning** — Expo platform limitation. MITM possible with network proxy on same WiFi. Mitigated by ATS (TLS 1.2+) and HTTPS-only policy. Practical exploitation requires physical proximity and targeted attack.

4. **No jailbreak detection** — Compromised devices could inspect app memory. Low practical risk for a maintenance tracking app. Subscription validation server-side is the real defense.

5. **Convex storage IDs** — UUIDs, not guessable. No ownership validation on reference, but IDs are random 128-bit values. Extremely low collision/guess probability.

6. **Deep link scheme `myapp`** — Generic scheme name could theoretically conflict with other apps. Low risk since Expo Router validates routes server-side and no sensitive data passes through deep links.

---

## Recommendations for Ongoing Security

### Pre-Launch (Required):
1. Implement RevenueCat webhook or REST API validation in `convex/subscriptions.ts`
2. Add cron job to clean up old `rateLimits` table entries
3. Set billing caps: OpenAI ($50/mo), Twilio ($20/mo), Resend ($10/mo)

### Post-Launch (Recommended):
4. Monitor Convex dashboard for unusual rate limit hits or error spikes
5. Add Sentry or similar error monitoring (server-side capture, not client console)
6. Run `npx expo install --check` to update patch-level dependencies

### Quarterly:
7. Run `npm audit` and update dependencies with security patches
8. Review Convex function logs for suspicious patterns
9. Rotate API keys (OpenAI, Twilio, Resend) and update in Convex env vars

### Future Enhancements:
10. Add RevenueCat server-side webhook for real-time subscription status sync
11. Consider `expo-local-authentication` (biometric) for sensitive actions
12. Evaluate custom native module for certificate pinning if user base grows
13. Evaluate jailbreak detection library if subscription abuse becomes an issue
