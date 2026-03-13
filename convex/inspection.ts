"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");
  return new OpenAI({ apiKey });
};

// Step 1: Web search to research exact bike specs before generating checklist
async function researchBikeSpecs(
  openai: OpenAI,
  year: number,
  make: string,
  model: string
): Promise<string> {
  try {
    console.log(`[Inspection] Researching ${year} ${make} ${model} specs via web search...`);
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      web_search_options: {
        search_context_size: "medium",
      },
      messages: [
        {
          role: "user",
          content: `Research the exact technical specifications for a ${year} ${make} ${model} motorcycle. I need to know:

1. Fuel system: Is it carbureted or fuel injected? What exact system (e.g. Mikuni BSR36 carbs, Keihin FI, etc.)?
2. Cooling: Air-cooled, liquid-cooled, or oil-cooled?
3. Drive: Chain, belt, or shaft drive?
4. Clutch: Cable-operated or hydraulic?
5. ABS: Does this specific year have ABS (standard or optional)?
6. Valve adjustment: Shim-under-bucket, screw-type, or hydraulic lifters?
7. Engine type and displacement
8. Any known common issues, recalls, or weak points specific to this year and model

Be precise about the EXACT YEAR — many models changed specs between generations. Return factual specs only.`,
        },
      ],
    } as any);

    const textContent = response.choices[0]?.message?.content || "";
    console.log(`[Inspection] Research complete: ${textContent.length} chars`);
    return textContent || "No research results available.";
  } catch (error: any) {
    console.error(`[Inspection] Web search FAILED: ${error.message}`);
    return "Web search unavailable — rely on training data only, and when uncertain about a component, use generic descriptions rather than specifying carbureted/fuel-injected etc.";
  }
}

const InspectionItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.enum(["tires", "brakes", "fluids", "chain", "electrical", "general"]),
  response_type: z.enum(["choice", "number", "text"]),
  options: z.array(z.string()).nullable(),
  unit: z.string().nullable(),
});

const InspectionChecklistSchema = z.object({
  items: z.array(InspectionItemSchema),
});

// Generate an inspection checklist using a lightweight model
export const generateChecklist = internalAction({
  args: {
    bikeId: v.id("bikes"),
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    mileage: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { bikeId, userId, make, model, year, mileage, notes }) => {
    try {
      const openai = getOpenAIClient();

      // Step 1: Research bike specs via web search
      const bikeResearch = await researchBikeSpecs(openai, year, make, model);

      const notesInfo = notes ? `\nAdditional notes: ${notes}` : "";

      const prompt = `You are an expert motorcycle mechanic who specializes in ${make} motorcycles, particularly the ${model}. A user has a ${year} ${make} ${model} with ${mileage} km on the odometer but NO SERVICE HISTORY — they don't know when anything was last done.${notesInfo}

VERIFIED BIKE SPECIFICATIONS (from web research — use these as ground truth):
${bikeResearch}

Generate an inspection checklist of 12-18 items they should check on their bike RIGHT NOW before we can create an accurate maintenance plan.

CRITICAL ACCURACY RULE: Only include inspection items for components that ACTUALLY EXIST on the ${year} ${make} ${model}. You must verify each item against your knowledge of this specific model before including it. Examples of mistakes to avoid:
- Do NOT ask about hydraulic clutch fluid if this bike has a cable-operated clutch
- Do NOT ask about coolant if this bike is air-cooled only
- Do NOT ask about drive shaft if this bike has chain drive
- Do NOT ask about ABS components if this model year has no ABS
- Do NOT ask about carburetors/petcocks if this bike is fuel injected
- Do NOT ask about fuel injection if this bike is genuinely carbureted
If you are not 100% certain a component exists on this exact model and year, leave it out.

FUEL SYSTEM ACCURACY: Many motorcycles switched from carburetors to fuel injection mid-generation. You MUST get this right:
- Research the EXACT year and market to determine fuel system type
- For example: Suzuki SV650 2003+ (2nd gen) = fuel injected, NOT carbureted
- When in doubt about fuel system type, use a GENERIC "Fuel System Check" item rather than specifying carbureted or fuel injected
- Never confidently state a bike is carbureted or fuel injected unless you are certain for that specific year and model

MANDATORY FUEL SYSTEM CHECK: You MUST always include a fuel system inspection item, regardless of type:
- For fuel-injected bikes: Check fuel pump priming (key-on buzz), inspect fuel lines/hoses for cracks or leaks, check for fuel smell, throttle body sync (multi-cylinder), fuel filter condition if accessible
- For carbureted bikes: Check petcock operation, fuel lines, carb inlets, float bowls for leaks
- Label it accurately: "Fuel System Check (fuel injected)" or "Fuel System Check (carbureted)" based on the verified specs above

This checklist must be SPECIFIC to the ${year} ${make} ${model}. Do NOT just give a generic motorcycle checklist. You must include:

1. STANDARD SAFETY ITEMS (tires, brakes, chain/drive, fluids) — but ONLY fluids and components that this bike actually has:
   - Reference the correct fluid types, capacities, or specs for this exact bike
   - Mention model-specific brake/tire specs if known
   - TIRES: You MUST include ALL of these as separate items (do not combine or skip any):
     * "Front Tire Age" — response_type: "number", unit: "years"
     * "Front Tire Tread Depth" — response_type: "number", unit: "mm"
     * "Rear Tire Age" — response_type: "number", unit: "years"
     * "Rear Tire Tread Depth" — response_type: "number", unit: "mm"
     These 4 tire items are MANDATORY. Do not merge them into one item or skip any.

2. MODEL-SPECIFIC KNOWN ISSUES — Research your knowledge of the ${make} ${model} for:
   - Common failure points or weak spots specific to this model/year
   - Hidden maintenance items that owners often miss (e.g. drainage holes, breather tubes, cam chain tensioners, regulator/rectifier issues, etc.)
   - Model-specific recalls or service bulletins
   - Year-specific issues (early vs late production runs)
   - Known design quirks that require special attention

3. MILEAGE-APPROPRIATE CHECKS — At ${mileage} km, what components on this specific bike are likely to be wearing out or due for replacement?

For each item:
- name: Short label (e.g. "Front Tire Tread Depth")
- description: What to look for and how to check (1-2 sentences, practical). Include model-specific locations or tips where relevant (e.g. "Located on the left side of the engine block behind the shift lever")
- category: One of "tires", "brakes", "fluids", "chain", "electrical", "general"
- response_type: How the user should answer:
  - "choice" — provide options array (e.g. ["Good", "Worn", "Needs replacement"])
  - "number" — for measurable values, provide a unit (e.g. "mm", "years", "km")
  - "text" — for free-text descriptions
- options: Array of choices (only for "choice" type)
- unit: Measurement unit (only for "number" type)

Order by priority — most critical safety items first, then model-specific issues, then general wear items.
Keep descriptions practical — assume the user is standing next to the bike with basic tools.`;

      console.log(`[Inspection] Generating checklist for ${year} ${make} ${model}...`);

      const response = await openai.chat.completions.parse({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: `You are an expert motorcycle mechanic who specializes in ${make} motorcycles. You have deep knowledge of model-specific issues, common failure points, hidden maintenance items, and year-specific quirks. Create a thorough pre-service inspection checklist that goes beyond generic items.`,
          },
          { role: "user", content: prompt },
        ],
        response_format: zodResponseFormat(InspectionChecklistSchema, "inspection_checklist"),
      });

      const parsed = response.choices[0].message.parsed;
      if (!parsed) throw new Error("Failed to parse inspection checklist");

      console.log(`[Inspection] Got ${parsed.items.length} items, saving...`);

      // Save items to DB (convert null → undefined for Convex)
      for (let i = 0; i < parsed.items.length; i++) {
        const item = parsed.items[i];
        await ctx.runMutation(internal.inspectionMutations.insertItem, {
          bikeId,
          userId,
          name: item.name,
          description: item.description,
          category: item.category,
          responseType: item.response_type,
          options: item.options ?? undefined,
          unit: item.unit ?? undefined,
          order: i,
        });
      }

      // Mark inspection as ready (items exist, user can fill them in)
      await ctx.runMutation(internal.inspectionMutations.setBikeInspectionStatus, {
        bikeId,
        status: "ready",
      });

      console.log(`[Inspection] Checklist saved successfully for bike ${bikeId}`);
    } catch (error: any) {
      console.error(`[Inspection] Failed to generate checklist: ${error.message}`);
      // Mark as error so UI can recover
      await ctx.runMutation(internal.inspectionMutations.setBikeInspectionStatus, {
        bikeId,
        status: "error",
      });
    }
  },
});
