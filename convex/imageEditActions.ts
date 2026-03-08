"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");
  return new OpenAI({ apiKey });
};

export const generateEpicBikePhoto = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }) => {
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

    return {
      originalStorageId: storageId,
      editedStorageId,
      editedUrl,
    };
  },
});
