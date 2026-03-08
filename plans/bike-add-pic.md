# Bike Epic Photo Edit — "Los Santos Customs" Feature

## Overview
Allow users to take/pick a photo of their bike, send it to OpenAI's `gpt-image-1` image edit API, and get back an epic stylized version — the bike reimagined as if it's sitting in Los Santos Customs from GTA.

**This feature is integrated into the "Add Bike" flow as the very first step.**

## Architecture

### User Flow — Add Bike (Updated)

The `app/add-bike.tsx` screen is restructured into a multi-step flow:

```
Step 1: PHOTO UPLOAD (NEW — first thing the user sees)
┌──────────────────────────┐
│  ← Back      Add Bike    │
│                          │
│   "First, show us your   │
│    ride!"                │
│                          │
│  ┌──────────────────┐    │
│  │                  │    │
│  │  [Camera icon]   │    │
│  │  Tap to take     │    │
│  │  a photo         │    │
│  │                  │    │
│  └──────────────────┘    │
│                          │
│  [Take Photo]            │
│  [Choose from Gallery]   │
│  [Skip for now]          │
│                          │
└──────────────────────────┘

Step 2: EPIC SHOT PROCESSING (automatic after photo selected)
┌──────────────────────────┐
│                          │
│  Original photo fades in │
│                          │
│  "Sending your ride to   │
│   Los Santos Customs..." │
│                          │
│  [Rotating GTA messages] │
│  - "Applying custom      │
│     paint job..."        │
│  - "Installing neon      │
│     underglow..."        │
│  - "Upgrading exhaust    │
│     system..."           │
│                          │
│  [Loading animation]     │
│                          │
└──────────────────────────┘

Step 3: EPIC SHOT RESULT (shown once AI returns)
┌──────────────────────────┐
│                          │
│  [Epic edited photo]     │
│  Full-width hero image   │
│                          │
│  "Your ride is ready."   │
│                          │
│  [Use This Shot]  (primary)
│  [Retake]         (secondary)
│                          │
└──────────────────────────┘

Step 4: BIKE DETAILS FORM (existing form — make, model, year, etc.)
┌──────────────────────────┐
│  The current add-bike    │
│  form fields appear:     │
│  - Make                  │
│  - Model                 │
│  - Year                  │
│  - Current Mileage       │
│  - Last Service Date     │
│  - Last Service Mileage  │
│  - Notes                 │
│                          │
│  [Add Bike]              │
└──────────────────────────┘
```

**Key behaviors:**
- Photo step is first — sets the tone, makes the experience feel premium
- After selecting a photo, the Los Santos Customs edit kicks off automatically (no extra button press)
- While AI processes (~10-20s), show rotating GTA-themed loading messages
- Once result comes back, user sees the epic shot and can accept or retake
- If user taps "Skip for now", jump straight to the bike details form (step 4)
- The accepted epic shot URL is stored alongside the bike when the form is submitted
- The original photo is also kept in storage (for retakes or future use)

### Integration with `app/add-bike.tsx`

The current `add-bike.tsx` is a single form page. It needs to become a **multi-step flow**:

1. Add a `step` state: `'photo' | 'processing' | 'result' | 'details'`
2. Step 1 (`photo`): New photo upload UI with camera/gallery picker
3. Step 2 (`processing`): Auto-triggered after photo selection — upload to Convex, call AI, show loading
4. Step 3 (`result`): Display the epic shot, accept or retake
5. Step 4 (`details`): The existing form, now with the epic shot displayed as a header image
6. On form submit, pass the `editedStorageId` / `editedUrl` to the `addBike` mutation as `imageUrl`

### Backend Flow
1. User selects/takes a photo via expo-image-picker
2. Photo is uploaded to Convex file storage (generate upload URL → POST blob)
3. A Convex action sends the image to OpenAI `POST /v1/images/edits` with the epic prompt
4. The edited image (base64) is saved back to Convex file storage
5. The new image URL is returned and displayed to the user
6. When user submits the bike form, the edited image URL is saved as `bikes.imageUrl`

### Tech Stack
- **expo-image-picker** — camera/gallery selection
- **Convex file storage** — store original + edited images
- **OpenAI Image Edit API** (`gpt-image-1`) — AI image editing
- **Convex action** (`"use node"`) — server-side API call to OpenAI

---

## Implementation Steps

### Step 1: Install expo-image-picker (if not already installed)

```bash
npx expo install expo-image-picker
```

### Step 2: Add Convex file storage helpers

Create `convex/imageEdits.ts`:

```typescript
"use node";

import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");
  return new OpenAI({ apiKey });
};

// Action: Generate an epic "Los Santos Customs" edit of a bike photo
export const generateEpicBikePhoto = action({
  args: {
    storageId: v.id("_storage"),  // The uploaded original image
    bikeId: v.id("bikes"),
  },
  handler: async (ctx, { storageId, bikeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 1. Get the original image bytes from Convex storage
    const imageBlob = await ctx.storage.get(storageId);
    if (!imageBlob) throw new Error("Image not found in storage");

    const imageBuffer = await imageBlob.arrayBuffer();
    const imageFile = new File(
      [imageBuffer],
      "bike.png",
      { type: "image/png" }
    );

    // 2. Call OpenAI Image Edit API
    const openai = getOpenAIClient();

    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: `Transform this motorcycle photo into an epic cinematic shot as if the bike is inside Los Santos Customs from GTA.
The environment should look like a high-end underground custom garage with:
- Neon lighting (blue, purple, orange glows)
- Industrial concrete/metal walls with graffiti
- A hydraulic car lift and tool racks visible in background
- Dramatic volumetric lighting and lens flares
- The bike should look polished, gleaming, and heroic
- GTA-style atmosphere: gritty but stylish, urban custom shop vibes
- Sparks or welding effects in the background for extra drama
- The overall mood should feel like a loading screen from GTA
Keep the bike itself accurate and recognizable but make everything around it EPIC.`,
      size: "1024x1024",
    });

    // 3. The response contains base64 image data
    const b64Data = response.data?.[0]?.b64_json;
    if (!b64Data) throw new Error("No image data returned from OpenAI");

    // 4. Convert base64 to buffer and upload to Convex storage
    const editedBuffer = Buffer.from(b64Data, "base64");
    const editedBlob = new Blob([editedBuffer], { type: "image/png" });
    const editedStorageId = await ctx.storage.store(editedBlob);

    // 5. Get the serving URL
    const editedUrl = await ctx.storage.getUrl(editedStorageId);

    // 6. Optionally update the bike's imageUrl
    // (User can choose to set this as their bike pic later)

    return {
      originalStorageId: storageId,
      editedStorageId,
      editedUrl,
    };
  },
});
```

### Step 3: Add the upload mutation

In `convex/imageEdits.ts` (or a separate file), add a mutation to generate an upload URL:

```typescript
import { mutation } from "./_generated/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});
```

### Step 4: Restructure `app/add-bike.tsx` into multi-step flow

Refactor the existing `app/add-bike.tsx` to add step management:

```typescript
type AddBikeStep = 'photo' | 'processing' | 'result' | 'details';

const [step, setStep] = useState<AddBikeStep>('photo');
const [originalUri, setOriginalUri] = useState<string | null>(null);
const [epicShotUrl, setEpicShotUrl] = useState<string | null>(null);
const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
```

**Step-by-step rendering:**

- `step === 'photo'` — Render `PhotoUploadStep` component:
  - Hero text: "First, show us your ride!"
  - Two buttons: "Take Photo" (camera) and "Choose from Gallery"
  - "Skip for now" link at the bottom
  - On photo selected → set `originalUri`, move to `'processing'`
  - On skip → move directly to `'details'`

- `step === 'processing'` — Render `EpicShotProcessing` component:
  - Shows the original photo with a dark overlay
  - Rotating GTA-themed loading messages (cycle every 3s):
    - "Entering Los Santos Customs..."
    - "Applying custom paint job..."
    - "Installing neon underglow..."
    - "Upgrading exhaust system..."
    - "Buffing out the scratches..."
    - "Your ride is almost ready..."
  - Uploads photo to Convex storage, calls `generateEpicBikePhoto` action
  - On success → set `epicShotUrl`, move to `'result'`
  - On error → show error toast, allow retry or skip

- `step === 'result'` — Render `EpicShotResult` component:
  - Full-width hero display of the epic edited photo
  - "Your ride is ready." text
  - Two buttons: "Use This Shot" (primary) → move to `'details'`, "Retake" → back to `'photo'`

- `step === 'details'` — Render the **existing form** (mostly unchanged):
  - If `epicShotUrl` exists, show it as a header image above the form
  - On submit, pass `epicShotUrl` as `imageUrl` to the `addBike` mutation

### Step 5: Create step components

Create `components/add-bike/PhotoUploadStep.tsx`:
- Camera/gallery picker using expo-image-picker
- Styled upload area with camera icon
- Skip option

Create `components/add-bike/EpicShotProcessing.tsx`:
- Loading animation with rotating messages
- Original photo as background with overlay
- Handles the upload + AI call logic

Create `components/add-bike/EpicShotResult.tsx`:
- Full display of the edited image
- Accept/retake buttons

### Step 6: Update `addBike` mutation

Ensure `convex/bikes.ts` `add` mutation accepts `imageUrl` (it already has `imageUrl: v.optional(v.string())` in the schema, verify the mutation passes it through).

### Step 7: Add save-to-bike functionality for existing bikes

Add a mutation for updating an existing bike's image (for future "retake epic shot" from bike detail screen):

```typescript
// convex/bikes.ts — add mutation
export const updateBikeImage = mutation({
  args: {
    bikeId: v.id("bikes"),
    imageUrl: v.string(),
  },
  handler: async (ctx, { bikeId, imageUrl }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.db.patch(bikeId, { imageUrl });
  },
});
```

---

## API Details

### OpenAI Image Edit Endpoint

```
POST /v1/images/edits
```

**Key parameters:**
- `model`: `"gpt-image-1"` (latest image editing model, supports high-fidelity edits)
- `image`: The source image file (user's bike photo)
- `prompt`: The transformation description (Los Santos Customs theme)
- `size`: `"1024x1024"` (square output)
- No `mask` needed — we want the whole image transformed

**Response:**
```json
{
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAA..."
    }
  ]
}
```

The response returns base64-encoded PNG data which we decode and store in Convex file storage.

---

## File Checklist

| File | Action | Purpose |
|------|--------|---------|
| `convex/imageEdits.ts` | **Create** | Upload URL mutation + OpenAI image edit action |
| `components/add-bike/PhotoUploadStep.tsx` | **Create** | Step 1: camera/gallery picker UI |
| `components/add-bike/EpicShotProcessing.tsx` | **Create** | Step 2: loading state + upload + AI call |
| `components/add-bike/EpicShotResult.tsx` | **Create** | Step 3: display result, accept/retake |
| `app/add-bike.tsx` | **Edit** | Restructure into multi-step flow (photo → processing → result → details) |
| `convex/bikes.ts` | **Edit** | Add `updateBikeImage` mutation, verify `add` passes `imageUrl` |
| `package.json` | **Edit** | Add expo-image-picker if missing |

---

## Prompt Engineering Notes

The prompt for the image edit is critical. Key elements:
- **Environment**: Los Santos Customs garage (neon lights, industrial, graffiti)
- **Lighting**: Dramatic, volumetric, cinematic lens flares
- **Bike treatment**: Keep recognizable but make it gleam/shine
- **Atmosphere**: GTA loading screen vibes — gritty but stylish
- **Extra flair**: Sparks, welding effects, tool racks in background

The prompt can be iterated on to improve results. Consider allowing users to pick from style presets in the future (e.g., "Night Ride", "Desert Highway", "Track Day").

---

## Cost & Limits

- OpenAI `gpt-image-1` image edits: ~$0.04-0.08 per edit (1024x1024)
- Consider rate-limiting per user (e.g., 3 epic shots per day) to control costs
- Images are stored in Convex file storage (included in Convex plan)

---

## Future Enhancements (Out of Scope)

- Multiple style presets beyond Los Santos Customs
- Before/after slider comparison view
- Social sharing with Apex watermark
- Gallery of past epic shots per bike
