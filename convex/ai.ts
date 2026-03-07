"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Id } from "./_generated/dataModel";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set");
  return new OpenAI({ apiKey });
};

// Zod schema for the structured maintenance plan response
const MaintenanceTaskSchema = z.object({
  task: z.string(),
  description: z.string(),
  interval_km: z.number(),
  interval_months: z.number(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  estimated_cost_usd: z.number(),
  estimated_labor_cost_usd: z.number(),
  parts_needed: z.array(z.string()),
  due_date: z.string().nullable(),
  due_mileage: z.number().nullable(),
});

const MaintenancePlanSchema = z.object({
  bike_name: z.string(),
  tasks: z.array(MaintenanceTaskSchema),
  total_estimated_cost: z.number(),
  next_service_date: z.string(),
});

// Zod schema for the structured parts list response
const PartSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  part_number: z.string().nullable(),
  estimated_price: z.number().nullable(),
  supplier: z.string().nullable(),
  url: z.string().nullable(),
  category: z.enum(["required", "consumable", "tool"]),
});

const PartsListSchema = z.object({
  required_reasoning: z.string(), // What parts are consumed/replaced in this task?
  consumable_reasoning: z.string(), // What single-use items get used up? (gaskets, washers, sealant, etc.)
  tool_reasoning: z.string(), // What specialised (non-basic) tool would help a home mechanic do this job?
  parts: z.array(PartSchema),
});

// Internal action: Generate a maintenance plan using OpenAI
export const generateMaintenancePlan = internalAction({
  args: {
    bikeId: v.id("bikes"),
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    mileage: v.number(),
    lastServiceDate: v.optional(v.string()),
    lastServiceMileage: v.optional(v.number()),
    country: v.optional(v.string()),
    ridingStyle: v.optional(v.string()),
    annualMileage: v.optional(v.number()),
    climate: v.optional(v.string()),
    storageType: v.optional(v.string()),
    inspectionData: v.optional(v.string()),
    confirmedOkItems: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    { bikeId, userId, make, model, year, mileage, lastServiceDate, lastServiceMileage, country, ridingStyle, annualMileage, climate, storageType, inspectionData, confirmedOkItems }
  ): Promise<Id<"maintenancePlans">> => {
    const openai = getOpenAIClient();

    const hasServiceHistory = !!lastServiceDate;
    const lastServiceInfo = lastServiceDate
      ? `Last service date: ${lastServiceDate}${lastServiceMileage != null ? `, last service mileage: ${lastServiceMileage} km` : ""}.`
      : "No previous service history recorded.";

    const noHistoryRule = !hasServiceHistory
      ? `\n\nNO SERVICE HISTORY RULE:
The user has NO recorded service history. This does NOT mean everything is overdue. For STANDARD MAINTENANCE tasks (oil change, valve check, chain lube, etc.) that are NOT flagged by inspection results:
- Treat today as if the bike just had a full baseline service
- Schedule them at their normal intervals FORWARD from today's date and current mileage (e.g. oil change → due_date 6 months from now, due_mileage current + 6000)
- Do NOT set standard maintenance to "due now" — most should have FUTURE due dates
- Priority for standard maintenance should be medium or low
${inspectionData ? "IMPORTANT: This rule does NOT apply to items identified as problems in the inspection results below. Inspection-flagged items MUST still be included as tasks with urgency based on their severity." : ""}`
      : "";

    const countryInfo = country
      ? `User's Country: ${country}`
      : "User's Country: United States";

    // Build rider context for personalized intervals
    const riderContextParts: string[] = [];
    if (ridingStyle) riderContextParts.push(`Riding Style: ${ridingStyle}`);
    if (annualMileage) riderContextParts.push(`Annual Mileage: ~${annualMileage} km/year`);
    if (climate) riderContextParts.push(`Climate/Conditions: ${climate}`);
    if (storageType) riderContextParts.push(`Storage: ${storageType}`);
    const riderContext = riderContextParts.length > 0
      ? `\n\nRIDER PROFILE:\n${riderContextParts.join("\n")}`
      : "";

    const today = new Date().toISOString().split("T")[0];
    const inspectionInfo = inspectionData
      ? `\n\nPRE-SERVICE INSPECTION RESULTS (user-reported, today is ${today}):\n${inspectionData}\n\nRULES FOR INSPECTION-BASED PLAN — FOLLOW EXACTLY:
1. ASSESS EACH ITEM as an expert mechanic. The user reported their findings — YOU must judge whether each item is a problem or acceptable:
   - Tires aged 1-3 years with good tread → FINE, no task needed.
   - Tires aged 5+ years → needs replacement regardless of tread.
   - Brake pads "Good" → no task. Brake pads "Metal on metal" → CRITICAL, immediate task.
   - Chain slack within spec → no task. Chain excessively worn → task needed.
   - Fluid "Clean" or "Good" → no task. Fluid "Dark/contaminated" → task needed.
   - Numbers must be interpreted in context of their unit and what's normal for that component.
2. ONLY create tasks for items that are genuinely problematic or out of spec. Items reported as good, clean, adequate, within spec, or recently serviced → DO NOT create tasks for them.
3. For tasks you DO create, set appropriate urgency:
   - SAFETY-CRITICAL (brake failure, tire dangerous) → due_date within 1-2 weeks, priority HIGH or CRITICAL.
   - MODERATE (worn but functional, should be addressed soon) → due_date 1-3 months out, priority MEDIUM.
   - MINOR (slightly out of spec, cosmetic) → due_date 3-6 months out, priority LOW.
4. You may add standard scheduled maintenance items (oil changes, valve checks, etc.) at their normal manufacturer intervals with future due dates — but these must NOT be due within the next month.
5. If everything looks good, generate a standard maintenance plan with all due dates in the future — nothing due immediately.`
      : "";

    const userPrompt = `You are an expert motorcycle mechanic. Generate a comprehensive maintenance plan for the following motorcycle:

Make: ${make}
Model: ${model}
Year: ${year}
Current Mileage: ${mileage} km
${lastServiceInfo}
${countryInfo}${riderContext}${noHistoryRule}${inspectionInfo}

PERSONALIZED INTERVALS RULE — USE THE RIDER PROFILE TO ADJUST ALL INTERVALS:
The rider profile above describes how the user actually rides. You MUST use it to adjust every task's interval_km, interval_months, and due_date — do NOT use generic manufacturer intervals without adapting them. Key factors:
- High annual mileage / daily riding → shorter km intervals, tasks come due sooner
- Low annual mileage / weekend riding → longer time intervals, tasks spaced further apart
- Wet/rainy/salty/dusty climate → accelerated wear on chain, brakes, corrosion-prone parts → shorter intervals
- Dry/mild climate → standard or longer intervals
- Outdoor/uncovered storage → more corrosion, UV damage, moisture → shorter intervals for chain, fluids, rubber parts
- Garage/indoor storage → standard intervals
- Aggressive/sport riding style → harder on brakes, tires, suspension → shorter intervals
- Casual/commuter riding → standard intervals

SUB-MONTHLY TASKS: For daily riders in harsh conditions, some tasks genuinely need to happen more often than monthly. Use interval_months decimals (0.5 = every 2 weeks). Consider adding these where the rider profile warrants it:
- Chain clean, lube & tension check: COMBINE into ONE single task called "Chain clean, lube & tension check" — do NOT create separate tasks for cleaning, lubing, and tension. Daily commuter in wet climate → interval_months: 0.5
- Tire pressure check: daily rider → interval_months: 0.5
- Quick visual safety check (brakes, lights, fluid levels): ONE combined task, daily rider → interval_months: 0.5-1
- Bike wash / corrosion rinse: wet/salty climate → interval_months: 0.5-1
For weekend/casual riders in dry climates, these can stay monthly or longer. Match the rider profile.
IMPORTANT: Each of the above must be exactly ONE task. Do NOT split into sub-tasks.

CRITICAL ACCURACY RULE: Only include maintenance tasks for components that ACTUALLY EXIST on the ${year} ${make} ${model}. You must verify each task against your knowledge of this specific model before including it. Examples of mistakes to avoid:
- Do NOT include carburetor sync/cleaning if this bike is fuel-injected
- Do NOT include coolant flush if this bike is air-cooled only
- Do NOT include drive shaft service if this bike has chain drive
- Do NOT include ABS service if this model year has no ABS
- Do NOT include hydraulic clutch service if this bike has a cable clutch
- Do NOT include valve clearance check if this bike has hydraulic valve adjusters
If you are not 100% certain a component exists on this exact model and year, leave it out.

Please provide a detailed maintenance plan that covers all recommended service intervals. For each task:
- Identify what needs to be done and why
- Specify service intervals (km and months) — EVERY task MUST have a positive interval_months value representing how often it should recur. Decimals are supported (0.5 = every 2 weeks, 1 = monthly, 3 = quarterly, 6 = biannual, 12 = annual, 24 = biennial). Even one-off repairs recur eventually — set a realistic re-inspection or replacement interval.
- Assign priority based on safety and mechanical necessity
- For estimated_cost_usd: estimate the DIY parts cost only — what it costs to buy the parts yourself, in the user's LOCAL currency (e.g. EUR for France, GBP for UK, USD for US, INR for India, etc.)
- For estimated_labor_cost_usd: estimate what a professional motorcycle mechanic shop in the user's country would charge for LABOR ONLY (not including parts) for this specific task. Use the average local motorcycle mechanic hourly rate for that country, in the user's LOCAL currency.
- List all parts that will be needed
- Calculate when the task is due based on current mileage and service history
- due_date MUST be a valid ISO date string (YYYY-MM-DD format, e.g. "2026-04-15"). NEVER use words like "now", "immediately", "ASAP", or "today" — always calculate the actual calendar date. If something is due immediately, use today's date: ${today}.

Focus on manufacturer-recommended maintenance items as well as common wear items for this bike.

IMPORTANT: Do NOT create separate tasks for front and rear of the same component (e.g. combine "front + rear brake pads" into one task, "front + rear tire replacement" into one task). Consolidate related items where sensible to avoid bloated task lists. Do NOT duplicate tasks — each distinct maintenance job should appear exactly once.`;

    const response = await openai.chat.completions.parse({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content:
            "You are an expert motorcycle mechanic with deep knowledge of service intervals, common failure points, and OEM parts for all major motorcycle manufacturers. Provide accurate, safety-conscious maintenance advice.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: zodResponseFormat(MaintenancePlanSchema, "maintenance_plan"),
    });

    const parsed = response.choices[0].message.parsed;
    if (!parsed) throw new Error("Failed to parse maintenance plan response from OpenAI");

    type TaskInput = z.infer<typeof MaintenanceTaskSchema>;

    // Map parsed tasks directly — good items are already filtered out before reaching AI
    const tasks = parsed.tasks.map((t: TaskInput) => ({
      name: t.task,
      description: t.description,
      intervalKm: t.interval_km > 0 ? t.interval_km : undefined,
      intervalMonths: t.interval_months > 0 ? t.interval_months : undefined,
      priority: t.priority,
      estimatedCostUsd: t.estimated_cost_usd > 0 ? t.estimated_cost_usd : undefined,
      estimatedLaborCostUsd: t.estimated_labor_cost_usd > 0 ? t.estimated_labor_cost_usd : undefined,
      dueDate: t.due_date && /^\d{4}-\d{2}-\d{2}/.test(t.due_date) ? t.due_date : undefined,
      dueMileage: t.due_mileage ?? undefined,
      partsNeeded: t.parts_needed.length > 0 ? t.parts_needed : undefined,
    }));

    // Save the plan and its tasks to the database
    const { planId, tasks: insertedTasks } = await ctx.runMutation(
      internal.maintenancePlans.savePlan,
      {
        bikeId,
        userId,
        totalEstimatedCost: parsed.total_estimated_cost,
        nextServiceDate: parsed.next_service_date,
        tasks,
      }
    );

    // Auto-generate parts for the top 4 highest-priority tasks
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const topTasks = [...insertedTasks]
      .sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99))
      .slice(0, 4);

    for (const task of topTasks) {
      await ctx.scheduler.runAfter(0, internal.ai.generatePartsList, {
        taskId: task._id,
        bikeId,
        userId,
        taskName: task.name,
        taskDescription: task.description,
        make,
        model,
        year,
      });
    }

    return planId;
  },
});

// Internal action: Generate a parts list for a specific maintenance task
export const generatePartsList = internalAction({
  args: {
    taskId: v.id("maintenanceTasks"),
    bikeId: v.id("bikes"),
    userId: v.string(),
    taskName: v.string(),
    taskDescription: v.optional(v.string()),
    make: v.string(),
    model: v.string(),
    year: v.number(),
  },
  handler: async (
    ctx,
    { taskId, bikeId, userId, taskName, taskDescription, make, model, year }
  ): Promise<string[]> => {
    const openai = getOpenAIClient();

    const descriptionInfo = taskDescription
      ? `\nTask Description: ${taskDescription}`
      : "";

    const userPrompt = `What parts, consumables, and tools do I need to BUY to complete this maintenance task on my motorcycle?

Motorcycle: ${year} ${make} ${model}
Maintenance Task: ${taskName}${descriptionInfo}

You MUST respond using the structured format. Before listing parts, you MUST fill in the three reasoning fields:

1. "required_reasoning" — Think step-by-step: what parts are physically consumed or replaced during this task? List them out.
2. "consumable_reasoning" — Think: what single-use items get used up during this job? (gaskets, crush washers, threadlock, sealant tape, zip ties, etc.) If none, say "none needed".
3. "tool_reasoning" — Think: what ONE specialised (non-basic) tool would help a home mechanic do this specific job properly? Consider: funnel kits, bleed kits, chain tools, feeler gauges, torque adapters, valve shim tools, etc. If there is a genuinely useful specialised tool, you MUST include it. If the task truly needs no specialised tool, say "no specialised tool needed" and do not include one.

Then populate "parts" with items from all three categories.

RULES:

1. Categories:
   - "required" — The actual part being replaced/consumed. Mandatory to complete the task.
   - "consumable" — Single-use items used up during the task (gaskets, washers, sealant, threadlock, etc). Include these whenever applicable.
   - "tool" — ONE specialised tool specific to THIS task. Rules:
     * NEVER basic hand tools: wrenches, sockets, socket sets, screwdrivers, pliers, hex keys, ratchets.
     * NEVER generic shop supplies: rags, shop towels, gloves, oil drain pans, jack stands, cleaning spray.
     * GOOD examples: radiator funnel kit, brake bleeder kit, chain breaker/riveter, valve shim tool, feeler gauge set, spoke torque wrench.
     * For MOTORCYCLES — simple, affordable, motorcycle-sized. Not professional automotive equipment.

2. Required parts: ONLY parts that are CONSUMED or REPLACED during this task.
   - Brake fluid change = brake fluid only. NOT seals/diaphragms.
   - Oil change = oil + oil filter. NOT gaskets beyond the drain plug washer.
   - NEVER pad the list with "while you're in there" extras.

3. For each item:
   - "purpose": short lowercase label of WHAT it IS (e.g. "coolant", "oil filter", "crush washer", "radiator funnel kit"). Two items with the same purpose = duplicate, one gets removed.
   - Recommend a specific product/brand (e.g. "Motul RBF 600 DOT 4 Brake Fluid 500ml").
   - OEM part number for a ${year} ${make} ${model} if confident, otherwise null.
   - Realistic USD retail price.
   - Supplier: RevZilla, Amazon, or J&P Cycles only.
   - Search URL using these patterns (replace SEARCH+TERMS with URL-encoded product name):
     - RevZilla: https://www.revzilla.com/search?query=SEARCH+TERMS
     - Amazon: https://www.amazon.com/s?k=SEARCH+TERMS
     - J&P Cycles: https://www.jpcycles.com/search?q=SEARCH+TERMS
   - No other suppliers. No direct product URLs.

4. NO DUPLICATES: One product per part type. Multiple DIFFERENT parts are fine (oil + filter + washer), but never two brands of the same thing.

5. LOGICAL CONSISTENCY — think critically:
   - Premixed coolant (50/50, ready-to-use)? Do NOT add distilled water.
   - Complete oil product? Don't add additives.
   - Ask for EVERY item: "Does the user actually need to buy this given what else is in the list?"

6. FINAL CHECK: Remove anything that fails: not genuinely needed, illogical with other items, or duplicate.`;

    const response = await openai.chat.completions.parse({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content:
            "You are a meticulous motorcycle parts specialist. You only recommend parts that are genuinely required for the requested task on the specific motorcycle model provided. You never pad lists with unnecessary items. When unsure of a part number, you leave it null rather than guessing. Accuracy is your top priority.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: zodResponseFormat(PartsListSchema, "parts_list"),
    });

    const parsed = response.choices[0].message.parsed;
    if (!parsed) throw new Error("Failed to parse parts list response from OpenAI");

    if (parsed.parts.length === 0) return [];

    type PartInput = z.infer<typeof PartSchema>;

    // Server-side deduplication: the AI often returns multiple brands for the
    // same part type (e.g. two coolants). We deduplicate using TWO strategies:
    //
    // 1. Primary: normalize the AI "purpose" field (strip fluff, keep core noun)
    // 2. Fallback: scan name + purpose for known part-type keywords
    //
    // If two parts resolve to the same type key, only the first one is kept.

    // Canonical synonyms — map variations to a single key
    const SYNONYM_MAP: Record<string, string> = {
      "antifreeze": "coolant",
      "anti-freeze": "coolant",
      "coolant fluid": "coolant",
      "engine coolant": "coolant",
      "radiator coolant": "coolant",
      "radiator fluid": "coolant",
      "motor oil": "engine oil",
      "4t oil": "engine oil",
      "4-stroke oil": "engine oil",
      "motorcycle oil": "engine oil",
      "brake disc": "brake rotor",
      "tyre": "tire",
      "front tire": "tire front",
      "rear tire": "tire rear",
      "front tyre": "tire front",
      "rear tyre": "tire rear",
    };

    // Known part-type keywords to scan for in name/purpose (longest first)
    const PART_TYPE_KEYWORDS = [
      "brake fluid", "brake pad", "brake rotor", "brake disc", "brake line", "brake lever",
      "spark plug", "oil filter", "air filter", "fuel filter",
      "chain lube", "chain cleaner", "chain wax", "chain kit", "chain",
      "coolant", "antifreeze", "anti-freeze",
      "engine oil", "motor oil", "gear oil", "fork oil", "transmission fluid",
      "hydraulic fluid", "clutch fluid",
      "tire", "tyre", "battery", "belt", "sprocket",
      "gasket", "o-ring", "crush washer", "drain plug", "seal",
    ];

    function normalizeType(raw: string): string {
      let s = raw.toLowerCase().trim();
      // Apply synonym mapping
      if (SYNONYM_MAP[s]) return SYNONYM_MAP[s];
      // Also check if any synonym key is contained in the string
      for (const [syn, canonical] of Object.entries(SYNONYM_MAP)) {
        if (s.includes(syn)) return canonical;
      }
      return s;
    }

    function extractPartType(name: string, purpose: string): string {
      // First: try to resolve from the purpose field
      const normalizedPurpose = normalizeType(purpose);
      // Check if the normalized purpose matches a known keyword
      for (const kw of PART_TYPE_KEYWORDS) {
        if (normalizedPurpose.includes(kw)) return normalizeType(kw);
      }
      // If purpose itself is short and specific, use it directly
      if (normalizedPurpose.split(" ").length <= 3) {
        return normalizedPurpose;
      }

      // Second: scan the product name for known keywords
      const lowerName = name.toLowerCase();
      for (const kw of PART_TYPE_KEYWORDS) {
        if (lowerName.includes(kw)) return normalizeType(kw);
      }

      // Third: scan combined text for synonym matches
      const combined = `${lowerName} ${normalizedPurpose}`;
      for (const [syn, canonical] of Object.entries(SYNONYM_MAP)) {
        if (combined.includes(syn)) return canonical;
      }

      // Last resort: unique key so it doesn't falsely dedup
      return `__unique__${name}`;
    }

    const seenTypes = new Set<string>();
    const dedupedParts: PartInput[] = [];
    const removedDupes: string[] = [];
    for (const p of parsed.parts) {
      const partType = extractPartType(p.name, p.purpose);
      if (!seenTypes.has(partType)) {
        seenTypes.add(partType);
        dedupedParts.push(p);
      } else {
        removedDupes.push(`"${p.name}" (type: ${partType})`);
      }
    }
    if (removedDupes.length > 0) {
      console.log(`[Parts Dedup] Removed ${removedDupes.length} duplicate(s): ${removedDupes.join(", ")}`);
    }

    // Logical consistency pass: remove items that are nonsensical given the rest of the list
    const allText = dedupedParts.map((p) => `${p.name} ${p.purpose}`.toLowerCase()).join(" ");
    const hasPremixed = /premix|predilut|ready.to.use|50\/50|pre-mixed|pre-dilut/.test(allText);

    const logicFiltered = dedupedParts.filter((p) => {
      const lower = `${p.name} ${p.purpose}`.toLowerCase();
      // Remove distilled/deionized water if a premixed product is already in the list
      if (hasPremixed && /distilled water|deionized water|deminerali[sz]ed water|mixing water/.test(lower)) {
        console.log(`[Parts Logic] Removed "${p.name}" — premixed product already in list, water not needed`);
        return false;
      }
      return true;
    });

    console.log(`[Parts] AI: ${parsed.parts.length} → dedup: ${dedupedParts.length} → logic: ${logicFiltered.length}`);
    const finalParts = logicFiltered;

    // Append affiliate tags to URLs before saving
    const amazonTag = process.env.AMAZON_AFFILIATE_TAG;
    const revzillaTag = process.env.REVZILLA_AFFILIATE_TAG;
    const jpcyclesTag = process.env.JPCYCLES_AFFILIATE_TAG;

    function addAffiliateTag(url: string | null): string | undefined {
      if (!url) return undefined;
      try {
        const u = new URL(url);
        if (u.hostname.includes("amazon.com") && amazonTag) {
          u.searchParams.set("tag", amazonTag);
        } else if (u.hostname.includes("revzilla.com") && revzillaTag) {
          u.searchParams.set("ref", revzillaTag);
        } else if (u.hostname.includes("jpcycles.com") && jpcyclesTag) {
          u.searchParams.set("ref", jpcyclesTag);
        }
        return u.toString();
      } catch {
        return url;
      }
    }

    // Map deduplicated parts to the format expected by saveParts
    const partsToSave = finalParts.map((p: PartInput) => ({
      taskId,
      bikeId,
      userId,
      name: p.name,
      partNumber: p.part_number ?? undefined,
      estimatedPrice: p.estimated_price ?? undefined,
      supplier: p.supplier ?? undefined,
      url: addAffiliateTag(p.url),
      category: p.category,
    }));

    // Save parts to the database
    const insertedIds: string[] = await ctx.runMutation(internal.parts.saveParts, {
      parts: partsToSave,
    });

    return insertedIds;
  },
});
