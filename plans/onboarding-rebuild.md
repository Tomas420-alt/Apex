# Onboarding Rebuild — High-Conversion Funnel

## Objective

Replace the current chat-style onboarding (`app/onboarding.tsx`, ~1200 lines) with a high-conversion screen-per-question funnel inspired by Life Reset / Calm / Headspace onboarding flows.

**Goals:**
- Reduce cognitive load (one question per screen)
- Create emotional engagement (personalized copy, visual reveals)
- Collect all required rider + motorcycle data (same data as current flow)
- Generate a maintenance plan via existing AI pipeline
- Create a "wow moment" with AI-generated bike image + Bike Health Score
- Feel like: **personalized setup → analysis → reveal → solution** — NOT a form

---

## Architecture Overview

### Current System (what exists)
- `app/onboarding.tsx` — Single-file chat-style interview (~30 questions, 12 sections)
- `convex/onboarding.ts` — `save()` mutation creates bike + updates user + schedules AI plan
- `convex/ai.ts` — `generateMaintenancePlan()` using OpenAI gpt-5.2
- `convex/imageEdits.ts` + `convex/imageEditActions.ts` — Epic bike photo generation (already built)
- `convex/bikes.ts` — `updateBikeImage()` mutation (already built)
- Gate: `app/(tabs)/_layout.tsx` redirects to `/onboarding` if `!user.hasCompletedOnboarding`

### New System (what to build)
- `app/onboarding/` — Directory-based routing with individual screen files
- `components/onboarding/` — Shared UI components (cards, progress bar, slider, etc.)
- `convex/onboarding.ts` — Extend with `computeHealthScore()` mutation
- Reuse existing: `convex/ai.ts`, `convex/imageEdits.ts`, `convex/imageEditActions.ts`, `convex/bikes.ts`

---

## File Structure

```
app/
  onboarding/
    _layout.tsx          — Stack navigator, no header, shared animated transitions
    index.tsx            — Screen 1: Welcome
    name.tsx             — Screen 2: Name
    motivation.tsx       — Screen 3: Why track maintenance?
    problems.tsx         — Screen 4: What problems do you face?
    riding-style.tsx     — Screen 5: Riding style
    riding-frequency.tsx — Screen 6: How often?
    annual-mileage.tsx   — Screen 7: Mileage slider
    climate.tsx          — Screen 8: Climate
    storage.tsx          — Screen 9: Storage
    experience.tsx       — Screen 10: Riding experience
    maintenance-skill.tsx— Screen 11: Maintenance comfort
    bike-details.tsx     — Screen 12: Make + Model + Year (single card)
    odometer.tsx         — Screen 13: Current mileage + unit toggle
    service-history.tsx  — Screen 14: Service history + conditional fields
    bike-photo.tsx       — Screen 15: Upload / take photo
    analysis.tsx         — Screen 16: AI analysis animation
    health-score.tsx     — Screen 17: Risk realization (current score)
    potential.tsx        — Screen 18: Future potential (improved score)
    plan-preview.tsx     — Screen 19: Maintenance plan preview
    reveal.tsx           — Screen 20: Bike image reveal + enter garage

components/
  onboarding/
    ProgressBar.tsx      — "Step X of Y" + animated bar
    SelectionCard.tsx    — Large tappable card with icon + label
    OnboardingScreen.tsx — Shared wrapper (safe area, padding, progress, animations)
    MileageSlider.tsx    — Custom slider for annual mileage
    HealthScoreRing.tsx  — Animated circular score gauge
    AnalysisStep.tsx     — Single analysis step with spinner/checkmark
    MetricCard.tsx       — Score breakdown card (maintenance tracking, risk, etc.)
```

---

## Screen-by-Screen Spec

### Navigation & State Management

Use a **shared context** to accumulate answers across screens:

```typescript
// app/onboarding/_layout.tsx
import { Stack } from 'expo-router';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: false, // prevent swipe-back mid-flow
        }}
      />
    </OnboardingProvider>
  );
}
```

```typescript
// contexts/OnboardingContext.tsx
interface OnboardingData {
  // User profile
  name: string;
  goal: string;           // NEW — motivation
  problem: string;        // NEW — pain point
  country: string;

  // Rider context (maps to existing bike fields)
  ridingStyle: string;
  ridingFrequency: string;
  annualMileage: number;  // stored in km
  climate: string;
  storageType: string;
  experienceLevel: string;
  maintenanceComfort: string;

  // Bike details
  make: string;
  model: string;
  year: number;
  mileage: number;        // stored in km
  units: 'km' | 'miles';

  // Service history
  hasServiceHistory: 'yes' | 'no' | 'new';
  lastServiceDate?: string;
  lastServiceMileage?: number;

  // Photo
  photoStorageId?: string;
  photoUrl?: string;

  // Computed
  healthScore?: number;
  aiImageUrl?: string;
}
```

**Key pattern:** Each screen reads from context, sets its value, then calls `router.push()` to advance. Auto-advance on card selection (no submit button needed for single-choice screens).

---

### Screen 1 — Welcome (`index.tsx`)

- **Purpose:** Hook the user
- **Title:** "Keep your motorcycle running perfectly"
- **Subtitle:** "We'll create a personalized maintenance system for your bike."
- **CTA button:** "Start setup" → navigates to `/onboarding/name`
- **Visual:** Motorcycle silhouette or Lottie animation (optional — can use a simple gradient + icon)
- **No progress bar** on this screen

### Screen 2 — Name (`name.tsx`)

- **Question:** "What should we call you?"
- **Input:** Text input, auto-focused
- **Submit:** Button or keyboard return
- **Saves:** `name` → context
- **Progress:** Step 1 of 16

### Screen 3 — Motivation (`motivation.tsx`)

- **Question:** "Why do you want to track maintenance?"
- **Cards (auto-advance on tap):**
  - Avoid breakdowns → `avoid-breakdowns`
  - Keep my bike running perfectly → `reliability`
  - Save money on repairs → `save-money`
  - Prepare for long trips → `trip-prep`
  - Increase resale value → `resale`
- **Saves:** `goal` → context
- **Note:** This is NEW data not in current onboarding. Store in `bikes.notes` or add to user table later.

### Screen 4 — Maintenance Problems (`problems.tsx`)

- **Question:** "What maintenance problems do you run into?"
- **Cards (auto-advance):**
  - I forget service intervals → `forget-intervals`
  - I lose track of maintenance → `lose-track`
  - Repairs surprise me → `surprise-repairs`
  - I don't know what needs servicing → `dont-know`
  - I don't track maintenance at all → `no-tracking`
- **Saves:** `problem` → context
- **Note:** NEW data. Include in notes for AI context.

### Screen 5 — Riding Style (`riding-style.tsx`)

- **Question:** "What type of riding do you mostly do?"
- **Cards (auto-advance):**
  - Commuting → `commuting`
  - Sport / spirited → `sport`
  - Touring → `touring`
  - Adventure / off-road → `off-road`
  - Mixed → `mixed`
- **Saves:** `ridingStyle` → context
- **Maps to:** `bikes.ridingStyle` (existing field)

### Screen 6 — Riding Frequency (`riding-frequency.tsx`)

- **Question:** "How often do you ride?"
- **Cards (auto-advance):**
  - Daily → `daily`
  - Several times per week → `several-weekly`
  - Weekends → `weekends`
  - Occasionally → `occasional`
  - Seasonal → `seasonal`
- **Saves:** `ridingFrequency` → context
- **Note:** Currently stored in notes; consider adding as bike field or keep in notes.

### Screen 7 — Annual Mileage (`annual-mileage.tsx`)

- **Question:** "How many [km/miles] do you ride per year?"
- **UI:** Custom slider with labeled stops
  - Range: 0 → 25,000+ km (or miles equivalent)
  - Snap points: 2000, 5000, 8000, 12000, 20000, 25000+
- **Unit toggle:** km / miles (use unit from later odometer screen, or default to km here)
- **Saves:** `annualMileage` (always stored as km) → context
- **Maps to:** `bikes.annualMileage` (existing field)

### Screen 8 — Climate (`climate.tsx`)

- **Question:** "What climate do you usually ride in?"
- **Cards (auto-advance):**
  - Hot & dry → `hot-dry`
  - Hot & humid → `hot-humid`
  - Temperate → `temperate`
  - Cold & wet → `cold-wet`
  - Snow / winter → `cold`
  - Mixed → `mixed`
- **Saves:** `climate` → context
- **Maps to:** `bikes.climate` (existing field)

### Screen 9 — Storage (`storage.tsx`)

- **Question:** "Where is your motorcycle usually stored?"
- **Cards (auto-advance):**
  - Garage → `garage`
  - Covered → `carport`
  - Outdoors → `outdoor`
  - Mixed → `mixed`
- **Saves:** `storageType` → context
- **Maps to:** `bikes.storageType` (existing field)

### Screen 10 — Experience (`experience.tsx`)

- **Question:** "How long have you been riding?"
- **Cards (auto-advance):**
  - Less than a year → `beginner`
  - 1-3 years → `intermediate`
  - 3-10 years → `advanced`
  - 10+ years → `expert`
- **Saves:** `experienceLevel` → context
- **Maps to:** `bikes.experienceLevel` (existing field)

### Screen 11 — Maintenance Skill (`maintenance-skill.tsx`)

- **Question:** "How comfortable are you with motorcycle maintenance?"
- **Cards (auto-advance):**
  - I don't touch it → `none`
  - Learning the basics → `beginner`
  - Basic stuff (oil, chain) → `basic`
  - Intermediate (brakes, filters) → `intermediate`
  - I do everything myself → `advanced`
- **Saves:** `maintenanceComfort` → context
- **Maps to:** `bikes.maintenanceComfort` (existing field)

### Screen 12 — Bike Details (`bike-details.tsx`)

- **Title:** "Tell us about your bike"
- **UI:** Single card with 3 stacked fields:
  - **Make** — Text input with autocomplete suggestions (Honda, Yamaha, Kawasaki, Suzuki, Ducati, BMW, KTM, Harley-Davidson, Triumph, Royal Enfield)
  - **Model** — Text input (free text)
  - **Year** — Number input (validated 1900-2027)
- **Submit button:** "Continue" (not auto-advance since multiple fields)
- **Saves:** `make`, `model`, `year` → context

### Screen 13 — Odometer (`odometer.tsx`)

- **Question:** "What's the current mileage?"
- **Inputs:**
  - Number input (large, centered)
  - Unit toggle: km / miles
- **Submit button:** "Continue"
- **Saves:** `mileage` (converted to km), `units` → context
- **Maps to:** `bikes.mileage` (existing field, stored in km)

### Screen 14 — Service History (`service-history.tsx`)

- **Question:** "Has the bike been serviced recently?"
- **Cards:**
  - Yes → reveals conditional fields inline (date picker + mileage input)
  - No → auto-advance
  - Just bought it → auto-advance
- **Conditional fields (if "Yes"):**
  - Last service date (date picker)
  - Mileage at last service (number input with unit toggle)
- **Submit button:** "Continue" (shown after selecting "Yes" and filling fields)
- **Saves:** `hasServiceHistory`, `lastServiceDate`, `lastServiceMileage` → context
- **Maps to:** `bikes.lastServiceDate`, `bikes.lastServiceMileage` (existing fields)

### Screen 15 — Bike Photo (`bike-photo.tsx`)

- **Title:** "Add a photo of your motorcycle"
- **Subtitle:** "We'll turn your bike into a custom visual for your dashboard."
- **Buttons:**
  - Take photo (expo-image-picker camera)
  - Upload photo (expo-image-picker gallery)
  - Skip (text link at bottom)
- **Tips text:** "Best results: full bike visible, side angle, good lighting"
- **On photo selected:**
  1. Upload to Convex file storage via `generateUploadUrl()` (from `convex/imageEdits.ts`)
  2. Store `photoStorageId` and `photoUrl` in context
  3. Show thumbnail preview with "Retake" option
  4. "Continue" button to advance
- **On skip:** Advance without photo
- **Reuse:** `convex/imageEdits.ts` `generateUploadUrl` mutation (already exists)

### Screen 16 — AI Analysis (`analysis.tsx`)

- **Purpose:** Create perceived intelligence while real work happens in background
- **No user input** — automated progression
- **Display sequential steps (staggered, ~0.8s each):**
  1. "Analyzing your motorcycle..." (spinner → checkmark)
  2. "Detecting bike details..." (spinner → checkmark)
  3. "Checking manufacturer service intervals..." (spinner → checkmark)
  4. "Generating your maintenance schedule..." (spinner → checkmark)
  5. "Building your garage dashboard..." (spinner → checkmark)
- **Background work (kicked off on mount):**
  1. Call `saveOnboarding()` mutation with all collected data (existing mutation)
  2. If photo exists: call `generateEpicBikePhoto()` action (existing in `convex/imageEditActions.ts`)
  3. Compute health score (see Health Score section below)
- **Wait for:** `saveOnboarding` to complete (returns `bikeId`)
- **Animation:** Use `react-native-reanimated` for step transitions (fade in, checkmark scale)
- **Auto-advance:** After all steps complete + minimum 3.5s elapsed → navigate to health-score

### Screen 17 — Health Score: Risk Realization (`health-score.tsx`)

- **Title:** "Based on your riding habits..."
- **Insight text (personalized):** e.g. "Riders with similar habits often miss 2-3 maintenance intervals per year."
- **Display:**
  - **HealthScoreRing** — Animated circular gauge showing score (e.g. 42/100)
  - Breakdown metrics:
    - Maintenance Tracking: X/100
    - Service Awareness: X/100
    - Breakdown Risk: Low/Medium/High
- **Score computed client-side** from onboarding answers (see formula below)
- **CTA:** "See your potential" → advance

### Screen 18 — Future Potential (`potential.tsx`)

- **Title:** "With proper maintenance tracking"
- **Show improved metrics (animated count-up):**
  - Bike Health Score: 85-95 (improved)
  - Breakdown Risk: Low
  - Maintenance Alerts: Active
- **Visual:** Same HealthScoreRing but animated from current → improved score
- **CTA:** "See your plan" → advance

### Screen 19 — Maintenance Plan Preview (`plan-preview.tsx`)

- **Title:** "Your personalized maintenance plan"
- **Show feature preview cards (not real data yet — plan may still be generating):**
  - Oil change reminders
  - Chain maintenance tracking
  - Brake inspection alerts
  - Service history log
- **Each card:** Icon + title + short description
- **CTA:** "Create my maintenance plan" → advance

### Screen 20 — Bike Image Reveal (`reveal.tsx`)

- **Purpose:** WOW moment
- **If AI image ready:** Display stylized bike image with fade-in/scale animation
- **If AI image still processing:** Show bike photo (original) or placeholder with "Your epic shot is being created..." message
- **Below image:** Mini dashboard preview:
  - Bike name (Make Model Year)
  - Health Score badge
  - "Next service" placeholder
- **CTA:** "Enter my garage" → `router.replace('/(tabs)')`

---

## Bike Health Score

### Computation (client-side, in context or analysis screen)

```typescript
function computeHealthScore(data: OnboardingData): {
  overall: number;
  maintenanceTracking: number;
  serviceAwareness: number;
  breakdownRisk: 'low' | 'medium' | 'high';
} {
  let score = 100;

  // Problem severity
  if (data.problem === 'no-tracking') score -= 20;
  else if (data.problem === 'forget-intervals') score -= 15;
  else if (data.problem === 'surprise-repairs') score -= 15;
  else if (data.problem === 'lose-track') score -= 10;
  else if (data.problem === 'dont-know') score -= 10;

  // Maintenance skill
  if (data.maintenanceComfort === 'none') score -= 15;
  else if (data.maintenanceComfort === 'beginner') score -= 10;
  else if (data.maintenanceComfort === 'basic') score -= 5;

  // High mileage = more wear
  if (data.annualMileage > 15000) score -= 10;
  else if (data.annualMileage > 8000) score -= 5;

  // Storage exposure
  if (data.storageType === 'outdoor') score -= 10;
  else if (data.storageType === 'carport') score -= 5;

  // Harsh climate
  if (['cold-wet', 'cold', 'hot-humid'].includes(data.climate)) score -= 10;

  // No service history
  if (data.hasServiceHistory === 'no' || data.hasServiceHistory === 'new') score -= 10;

  score = Math.max(score, 15); // floor

  const maintenanceTracking = Math.min(100, score + Math.random() * 10);
  const serviceAwareness = Math.min(100, score + Math.random() * 15);
  const breakdownRisk = score > 70 ? 'low' : score > 45 ? 'medium' : 'high';

  return {
    overall: Math.round(score),
    maintenanceTracking: Math.round(maintenanceTracking),
    serviceAwareness: Math.round(serviceAwareness),
    breakdownRisk,
  };
}
```

---

## Data Mapping to Existing Backend

### What maps directly (no schema changes needed):

| Onboarding Field | Backend Location | Notes |
|---|---|---|
| name | `users.name` | Already exists |
| country | `users.country` | Already exists |
| make, model, year | `bikes.make/model/year` | Already exists |
| mileage (km) | `bikes.mileage` | Already exists, store in km |
| ridingStyle | `bikes.ridingStyle` | Already exists |
| annualMileage | `bikes.annualMileage` | Already exists |
| climate | `bikes.climate` | Already exists |
| storageType | `bikes.storageType` | Already exists |
| experienceLevel | `bikes.experienceLevel` | Already exists |
| maintenanceComfort | `bikes.maintenanceComfort` | Already exists |
| lastServiceDate | `bikes.lastServiceDate` | Already exists |
| lastServiceMileage | `bikes.lastServiceMileage` | Already exists |
| photoUrl | `bikes.imageUrl` | Already exists |

### New fields to add:

| Field | Where | Purpose |
|---|---|---|
| `goal` | `bikes.notes` (append) or new `users.goal` field | Motivation — used for AI context |
| `problem` | `bikes.notes` (append) or new `users.problem` field | Pain point — used for health score + AI |
| `ridingFrequency` | `bikes.notes` (append) | Already handled this way in current flow |
| `healthScore` | Compute client-side, optionally store on `bikes` table | Display metric |

**Recommendation:** Add `goal` and `problem` to the notes string passed to `saveOnboarding()` for now (same pattern as current flow). No schema migration needed.

### Save Flow (Screen 16 — Analysis)

```typescript
// Reuse existing mutation — no changes needed
const bikeId = await saveOnboarding({
  make: data.make,
  model: data.model,
  year: data.year,
  mileage: data.mileage, // already in km
  lastServiceDate: data.lastServiceDate,
  lastServiceMileage: data.lastServiceMileage,
  ridingStyle: data.ridingStyle,
  annualMileage: data.annualMileage,
  climate: data.climate,
  storageType: data.storageType,
  experienceLevel: data.experienceLevel,
  maintenanceComfort: data.maintenanceComfort,
  country: data.country,
  notes: buildNotes(data), // include goal, problem, ridingFrequency, etc.
});

// If photo was uploaded, update bike image
if (data.photoStorageId) {
  await updateBikeImage({ bikeId, imageUrl: data.photoUrl });
}

// If photo exists, generate epic version
if (data.photoStorageId) {
  await generateEpicBikePhoto({
    storageId: data.photoStorageId,
    bikeId,
    make: data.make,
    model: data.model,
    year: data.year,
  });
}
```

---

## Shared Components

### `OnboardingScreen` — Wrapper for all screens

```typescript
interface OnboardingScreenProps {
  step?: number;        // current step (1-based), omit for welcome/analysis/reveal
  totalSteps?: number;  // default 16
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}
```

- SafeAreaView with `colors.bg` background
- Optional ProgressBar at top
- Title + subtitle with consistent typography
- Content area with proper padding
- Animated entry (fade + slide up) using `react-native-reanimated`

### `SelectionCard` — Large tappable option

```typescript
interface SelectionCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode; // optional icon/emoji
  selected?: boolean;
  onPress: (value: string) => void;
}
```

- Full-width card, ~64px height
- `colors.surface2` background, `colors.border` border
- Selected state: `colors.green` border, slight scale animation
- On press: brief highlight → call onPress → parent auto-advances

### `ProgressBar`

- Thin bar at top of screen
- Animated width based on `step / totalSteps`
- Color: `colors.green` (#00E599)
- Text: "Step X of Y" in `colors.textSecondary`

### `HealthScoreRing`

- SVG circular progress ring
- Animated fill using `react-native-reanimated` + `react-native-svg`
- Score number in center (animated count-up)
- Color: green (>70), orange (45-70), red (<45)

---

## Transition Animations

- **Card selection → next screen:** 300ms delay after tap, then slide_from_right
- **Analysis steps:** Staggered fade-in, spinner → checkmark morph
- **Health score ring:** 1.5s animated fill from 0 → score
- **Score improvement (Screen 18):** Animate ring from current → improved score
- **Bike reveal:** Scale from 0.8 → 1.0 with opacity 0 → 1, 800ms spring

All animations use `react-native-reanimated` (already installed, v4).

---

## Removed from Current Onboarding

These questions from the current chat flow are **dropped** in the new funnel (not high-value enough):

- Country (detect automatically or ask on settings) — **KEEP, move to implicit or settings**
- Known issues detail (free text) — Dropped, too much friction
- Budget priority — Dropped, can be in settings later
- Parts preference (OEM vs aftermarket) — Dropped, can be in settings
- Planned mods — Dropped, can be in settings
- Notification preferences (push/SMS/email) — **Move to post-onboarding prompt or settings**
- Phone number — **Move to settings**
- "Bike sitting" conditional questions — Dropped, edge case

**Rationale:** Every extra screen reduces completion rate. Keep onboarding to ~16 data screens + 4 reveal screens = 20 total. Settings can collect the rest.

---

## Implementation Order

### Phase 1 — Scaffolding
1. Create `app/onboarding/_layout.tsx` with Stack navigator
2. Create `contexts/OnboardingContext.tsx` with state + provider
3. Create `components/onboarding/OnboardingScreen.tsx` wrapper
4. Create `components/onboarding/ProgressBar.tsx`
5. Create `components/onboarding/SelectionCard.tsx`
6. Update `app/(tabs)/_layout.tsx` redirect: change `/onboarding` → `/onboarding/` (directory route)

### Phase 2 — Data Collection Screens (1-14)
7. Build screens 1-6 (welcome through frequency) — mostly SelectionCard screens
8. Build screen 7 (mileage slider) — custom MileageSlider component
9. Build screens 8-11 (climate through maintenance skill) — SelectionCard screens
10. Build screen 12 (bike details) — multi-field form
11. Build screen 13 (odometer) — number input + unit toggle
12. Build screen 14 (service history) — conditional form

### Phase 3 — Photo + Analysis
13. Build screen 15 (bike photo) — expo-image-picker + Convex upload
14. Build screen 16 (analysis) — animated steps + call saveOnboarding()
15. Wire up epic photo generation (reuse existing `generateEpicBikePhoto`)

### Phase 4 — Score + Reveal
16. Create `components/onboarding/HealthScoreRing.tsx`
17. Build screen 17 (health score) — risk realization
18. Build screen 18 (future potential) — improved score animation
19. Build screen 19 (plan preview) — feature cards
20. Build screen 20 (reveal) — AI image + enter garage

### Phase 5 — Cleanup
21. Delete old `app/onboarding.tsx`
22. Test full flow end-to-end
23. Verify `saveOnboarding()` mutation receives all required data
24. Verify maintenance plan generation triggers correctly

---

## Dependencies

Already installed (no new packages needed):
- `expo-router` — file-based routing
- `react-native-reanimated` v4 — animations
- `react-native-svg` — health score ring
- `expo-image-picker` — photo capture/upload (verify installed, may need to add)
- `expo-blur` — optional glass effects on cards
- `expo-linear-gradient` — background gradients

May need to install:
- `expo-image-picker` — check `package.json`, install if missing

---

## Country Detection

Instead of asking country explicitly (saves a screen), detect from device locale:

```typescript
import { getLocales } from 'expo-localization';
const country = getLocales()[0]?.regionCode; // e.g. "US", "GB", "AU"
```

Map region code to country name. Save automatically. User can change in settings.

---

## Key Differences from GPT Plan

| GPT Plan | This Spec | Reason |
|---|---|---|
| 16 screens | 20 screens | Added reveal flow (score, potential, preview, reveal) |
| Generic data model | Maps to existing Convex schema | No unnecessary migrations |
| New `user.goal`, `user.problem` fields | Store in `bikes.notes` | Avoid schema changes for v1 |
| "Upload bike photo" | Reuse existing `imageEdits.ts` pipeline | Already built |
| AI analysis = fake delay | Real work during animation | Call `saveOnboarding()` + `generateEpicBikePhoto()` |
| Health score on backend | Compute client-side | Faster, no extra mutation needed |
| Notification setup in onboarding | Move to post-onboarding | Reduces friction |
