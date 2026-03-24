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

// Web search to research exactly what's needed for a specific task on a specific bike
async function researchPartsForTask(
  openai: OpenAI,
  year: number,
  make: string,
  model: string,
  taskName: string,
  country?: string,
  taskDescription?: string
): Promise<string> {
  // Get user's preferred retailers for targeted price search
  const config = COUNTRY_SUPPLIERS[country || "United States"] || COUNTRY_SUPPLIERS["United States"];
  const retailerNames = config.suppliers.map(s => s.name).join(", ");
  const currency = config.currency;

  try {
    console.log(`[AI] Researching parts for "${taskName}" on ${year} ${make} ${model} (${country}, ${currency})...`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-search-preview",
      web_search_options: {
        search_context_size: "high",
      },
      messages: [
        {
          role: "system",
          content: `You are a motorcycle parts specialist. You ONLY return parts that are CONFIRMED compatible with the specific year/make/model. You never guess part numbers — if you can't verify compatibility, say so. You understand that motorcycle models have different generations with different parts (e.g. SV650 1999-2002 vs 2003-2009 use completely different brake pads).`,
        },
        {
          role: "user",
          content: `What EXACT parts do I need to buy to do "${taskName}" on a ${year} ${make} ${model}?${taskDescription ? ` Context: ${taskDescription}` : ""}

I am in ${country || "United States"}. All prices must be in ${currency}.

CRITICAL: Only recommend products that are widely available on Amazon and eBay — these are where the Buy links will go. Do NOT recommend products only found on niche/regional retailers (Louis, FC-Moto, SportsBikeShop, etc.) unless they are ALSO available on Amazon or eBay.

PRICING: For each item, search for the price specifically on Amazon or eBay (whichever is more relevant). The price you report should reflect what you'd find when searching for that product on Amazon or eBay, NOT some other retailer. This is important because the Buy link goes to Amazon/eBay and the user will compare your price to what they see there.

IMPORTANT: This is ONLY "${taskName}" — do NOT list parts for other jobs. For example, if the task is "replace brake pads", I only need pads and related consumables — NOT new rotors, calipers, or bearings unless they are worn.

Search the retailer sites above to find the correct aftermarket part numbers for a ${year} ${make} ${model}. The ${make} ${model} has multiple generations — confirm the part fits this EXACT year.

For each PART and CONSUMABLE, tell me:
- Product name and aftermarket part number (e.g. "EBC FA174HH")
- Specific product recommendation with brand (e.g. "Carlube Copper Slip 20g" not just "copper grease")
- Current retail price in ${currency} from one of the retailers listed above
- Retailer source

Include consumables with specific products and prices: brake cleaner (brand + price), grease (brand + price), fluid (brand + price), etc. Do NOT list consumables without prices.

TOOLS: Do NOT list basic hand tools (wrenches, sockets, screwdrivers, pliers, hex keys, ratchets, spanners). Only mention a tool if it is SPECIALISED for this specific task and a home mechanic wouldn't already own it (e.g. brake piston wind-back tool, valve shim tool). Max 1 specialised tool. Prefer the cheapest budget version.

Keep the list focused — only items genuinely needed for this specific task.

NEVER recommend: cosmetic/accessory items (valve caps, stickers, decals), upgraded/fancy versions of basic parts, racing/competition parts unless the task specifically requires them, generic household items (gloves, rags, cloths, towels, zip ties, tape, buckets, trays), or large equipment (paddock stands, bike lifts, torque wrenches, work stands). Stick to motorcycle-specific consumables and task-specific parts only.

STRICT RELEVANCE: Every item MUST be directly used during this specific task. For example:
- "Chain clean, lube & tension check" needs ONLY: chain cleaner, chain lube, and optionally a chain brush. NOT brake cleaner, NOT grease, NOT general solvents.
- "Tire pressure check" needs ONLY: a pressure gauge. NOT valve caps, NOT tire sealant.
- "Brake pad replacement" needs: pads, brake cleaner, copper grease for pad backs. NOT chain lube, NOT engine oil.
If you cannot explain exactly how an item is used DURING this task, do not include it.`,
        },
      ],
    } as any);

    const textContent = response.choices[0]?.message?.content || "";
    console.log(`[AI] Parts research complete: ${textContent.length} chars`);
    // Raw AI response logged only in truncated form for debugging
    console.log(`[AI] Parts research data: ${textContent.substring(0, 200)}...`);
    return textContent || "No research results available.";
  } catch (error: any) {
    console.error(`[AI] Parts web search FAILED: ${error.message}`);
    return "Web search unavailable — rely on training data only. When uncertain about part numbers, set part_number to null.";
  }
}

// Look up real prices by web-searching for each part
// Two-step: gpt-4o-search-preview does web search → gpt-4.1-nano extracts structured prices
// NOTE: URLs are NOT sourced from AI — they're built deterministically from SUPPLIERS templates

const PriceLookupItemSchema = z.object({
  price: z.number().nullable(),
  product_found: z.string(),
});
const PriceLookupResultSchema = z.object({
  results: z.array(PriceLookupItemSchema),
});

async function lookupPrices(
  openai: OpenAI,
  parts: Array<{ search_query: string; name: string; retailer: string }>,
  currency: string
): Promise<Map<string, number>> {
  if (parts.length === 0) return new Map();

  try {
    console.log(`[AI] Looking up ${parts.length} prices on assigned retailers...`);
    const searchResponse = await openai.chat.completions.create({
      model: "gpt-4o-search-preview",
      web_search_options: {
        search_context_size: "high",
      },
      messages: [
        {
          role: "user",
          content: `Find the current retail price for each of these motorcycle parts. Search each one individually.

${parts.map((p, i) => `${i + 1}. "${p.search_query}" on ${p.retailer} — price in ${currency}`).join("\n")}

IMPORTANT RULES:
- Search for each product on the SPECIFIC retailer website listed (e.g. ebay.ie, amazon.co.uk).
- The product found MUST closely match what was searched. If you search "Motul C1 Chain Clean 400ml", the result must be Motul C1 Chain Clean (not a kit, not a different product, not a different brand).
- Report the price INCLUDING shipping to Ireland if shipping is shown separately.
- Do NOT pick the absolute cheapest listing if it's from another country with high shipping — pick a listing that ships reasonably to Ireland.
- If you cannot find the exact product on that retailer, report null for the price rather than a wrong product.

For each item report: the price in ${currency}, the retailer, and the exact product name found.`,
        },
      ],
    } as any);

    const searchText = searchResponse.choices[0]?.message?.content || "";
    console.log(`[AI] Price search results (${searchText.length} chars): ${searchText.substring(0, 1000)}`);

    if (!searchText || searchText.length < 20) {
      console.error(`[AI] Price lookup: empty or too-short web search response`);
      return new Map();
    }

    // Step 2: Extract structured prices using forced JSON schema
    console.log(`[AI] Extracting structured prices from search results...`);
    const extractResponse = await openai.chat.completions.parse({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: `Extract prices from the research text below. Return exactly ${parts.length} results in the same order as the original numbered list. For each item extract: price (number in ${currency}, or null if not found), product_found (the exact product name found on the retailer page).`,
        },
        {
          role: "user",
          content: `Original search list:\n${parts.map((p, i) => `${i + 1}. "${p.search_query}" on ${p.retailer}`).join("\n")}\n\nResearch results to extract from:\n${searchText}`,
        },
      ],
      response_format: zodResponseFormat(PriceLookupResultSchema, "price_lookup"),
    });

    const extracted = extractResponse.choices[0].message.parsed;
    if (!extracted) {
      console.error(`[AI] Price extraction: failed to parse structured response`);
      return new Map();
    }

    const map = new Map<string, number>();
    for (let i = 0; i < parts.length && i < extracted.results.length; i++) {
      const item = extracted.results[i];
      const key = parts[i].search_query.toLowerCase();
      if (item.price !== null && item.price > 0) {
        map.set(key, item.price);
        console.log(`[Price] ${i + 1}. "${parts[i].search_query}" on ${parts[i].retailer} → ${currency}${item.price} (${item.product_found})`);
      } else {
        console.log(`[Price] ${i + 1}. "${parts[i].search_query}" on ${parts[i].retailer} → not found`);
      }
    }
    console.log(`[AI] Price lookup complete: ${map.size}/${parts.length} prices found`);
    return map;
  } catch (error: any) {
    console.error(`[AI] Price lookup FAILED: ${error.message}`);
    return new Map();
  }
}

// Web search to research exact bike specs before generating maintenance plan
async function researchBikeSpecs(
  openai: OpenAI,
  year: number,
  make: string,
  model: string
): Promise<string> {
  try {
    console.log(`[AI] Researching ${year} ${make} ${model} specs via web search...`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini-search-preview",
      web_search_options: {
        search_context_size: "medium",
      },
      messages: [
        {
          role: "user",
          content: `Research the exact technical specifications and maintenance schedule for a ${year} ${make} ${model} motorcycle. I need:

1. Fuel system: Carbureted or fuel injected? Exact system type?
2. Cooling: Air-cooled, liquid-cooled, or oil-cooled?
3. Drive: Chain, belt, or shaft? Chain size if applicable?
4. Clutch: Cable or hydraulic?
5. ABS: Standard, optional, or not available for this year?
6. Valve adjustment type: Shim-under-bucket, screw-type, or hydraulic lifters?
7. Engine oil type and capacity
8. Manufacturer recommended service intervals (oil change, valve check, coolant, spark plugs, brake fluid, etc.)
9. Common issues, known failure points, or recalls for this specific year
10. Tire sizes (front and rear)

Be precise about the EXACT YEAR. Return factual specs only.`,
        },
      ],
    } as any);

    const textContent = response.choices[0]?.message?.content || "";
    console.log(`[AI] Research complete: ${textContent.length} chars`);
    return textContent || "No research results available.";
  } catch (error: any) {
    console.error(`[AI] Web search FAILED: ${error.message}`);
    return "Web search unavailable — rely on training data only, and when uncertain about a component, use generic descriptions.";
  }
}

// ─── Country-aware supplier + currency configuration for parts generation ────
type SupplierInfo = { name: string; url: string };

// Core supplier URL templates
const SUPPLIERS = {
  revzilla:       { name: 'RevZilla', url: 'https://www.revzilla.com/search?query=SEARCH_TERMS' },
  jpcycles:       { name: 'J&P Cycles', url: 'https://www.jpcycles.com/search?q=SEARCH_TERMS' },
  sportsbikeshop: { name: 'SportsBikeShop', url: 'https://www.sportsbikeshop.co.uk/motorcycle_parts/content_search?s=SEARCH_TERMS' },
  louis:          { name: 'Louis (EU)', url: 'https://www.louis.eu/search?q=SEARCH_TERMS' },
  fcMoto:         { name: 'FC-Moto', url: 'https://www.fc-moto.de/en/search?q=SEARCH_TERMS' },
  xlmoto:         { name: 'XLmoto', url: 'https://www.xlmoto.eu/search?q=SEARCH_TERMS' },
  motardinn:      { name: 'Motardinn', url: 'https://www.tradeinn.com/motardinn/en/search?q=SEARCH_TERMS' },
  bikebiz:        { name: 'Bikebiz', url: 'https://www.bikebiz.com.au/search?q=SEARCH_TERMS' },
  motoNational:   { name: 'Moto National', url: 'https://www.motonational.com.au/search?q=SEARCH_TERMS' },
  webikeJP:       { name: 'Webike (JP)', url: 'https://www.webike.net/sm/SEARCH_TERMS/' },
  grandPitStop:   { name: 'Grand Pitstop', url: 'https://www.grandpitstop.com/search?q=SEARCH_TERMS' },
  lazada:         { name: 'Lazada', url: 'https://www.lazada.com/catalog/?q=SEARCH_TERMS' },
  shopee:         { name: 'Shopee', url: 'https://shopee.com/search?keyword=SEARCH_TERMS' },
  // Amazon regional
  amazonUS:  { name: 'Amazon (US)', url: 'https://www.amazon.com/s?k=SEARCH_TERMS' },
  amazonUK:  { name: 'Amazon (UK)', url: 'https://www.amazon.co.uk/s?k=SEARCH_TERMS' },
  amazonDE:  { name: 'Amazon (DE)', url: 'https://www.amazon.de/s?k=SEARCH_TERMS' },
  amazonFR:  { name: 'Amazon (FR)', url: 'https://www.amazon.fr/s?k=SEARCH_TERMS' },
  amazonIT:  { name: 'Amazon (IT)', url: 'https://www.amazon.it/s?k=SEARCH_TERMS' },
  amazonES:  { name: 'Amazon (ES)', url: 'https://www.amazon.es/s?k=SEARCH_TERMS' },
  amazonCA:  { name: 'Amazon (CA)', url: 'https://www.amazon.ca/s?k=SEARCH_TERMS' },
  amazonAU:  { name: 'Amazon (AU)', url: 'https://www.amazon.com.au/s?k=SEARCH_TERMS' },
  amazonIN:  { name: 'Amazon (IN)', url: 'https://www.amazon.in/s?k=SEARCH_TERMS' },
  amazonJP:  { name: 'Amazon (JP)', url: 'https://www.amazon.co.jp/s?k=SEARCH_TERMS' },
  amazonNL:  { name: 'Amazon (NL)', url: 'https://www.amazon.nl/s?k=SEARCH_TERMS' },
  amazonBR:  { name: 'Amazon (BR)', url: 'https://www.amazon.com.br/s?k=SEARCH_TERMS' },
  amazonMX:  { name: 'Amazon (MX)', url: 'https://www.amazon.com.mx/s?k=SEARCH_TERMS' },
  amazonSG:  { name: 'Amazon (SG)', url: 'https://www.amazon.sg/s?k=SEARCH_TERMS' },
  amazonAE:  { name: 'Amazon (AE)', url: 'https://www.amazon.ae/s?k=SEARCH_TERMS' },
  amazonSA:  { name: 'Amazon (SA)', url: 'https://www.amazon.sa/s?k=SEARCH_TERMS' },
  amazonPL:  { name: 'Amazon (PL)', url: 'https://www.amazon.pl/s?k=SEARCH_TERMS' },
  amazonSE:  { name: 'Amazon (SE)', url: 'https://www.amazon.se/s?k=SEARCH_TERMS' },
  // eBay regional
  ebayUS: { name: 'eBay (US)', url: 'https://www.ebay.com/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayUK: { name: 'eBay (UK)', url: 'https://www.ebay.co.uk/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayDE: { name: 'eBay (DE)', url: 'https://www.ebay.de/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayAU: { name: 'eBay (AU)', url: 'https://www.ebay.com.au/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayIE: { name: 'eBay (IE)', url: 'https://www.ebay.ie/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayFR: { name: 'eBay (FR)', url: 'https://www.ebay.fr/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayIT: { name: 'eBay (IT)', url: 'https://www.ebay.it/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayES: { name: 'eBay (ES)', url: 'https://www.ebay.es/sch/i.html?_nkw=SEARCH_TERMS' },
  ebayCA: { name: 'eBay (CA)', url: 'https://www.ebay.ca/sch/i.html?_nkw=SEARCH_TERMS' },
  // MercadoLibre regional
  mlMX: { name: 'MercadoLibre (MX)', url: 'https://listado.mercadolibre.com.mx/SEARCH_TERMS' },
  mlBR: { name: 'MercadoLibre (BR)', url: 'https://lista.mercadolivre.com.br/SEARCH_TERMS' },
  mlAR: { name: 'MercadoLibre (AR)', url: 'https://listado.mercadolibre.com.ar/SEARCH_TERMS' },
  mlCO: { name: 'MercadoLibre (CO)', url: 'https://listado.mercadolibre.com.co/SEARCH_TERMS' },
  mlCL: { name: 'MercadoLibre (CL)', url: 'https://listado.mercadolibre.cl/SEARCH_TERMS' },
} as const;

const S = SUPPLIERS;

// Country → suppliers (ordered by preference) + currency
const COUNTRY_SUPPLIERS: Record<string, { suppliers: SupplierInfo[]; currency: string }> = {
  // North America
  'United States':  { currency: 'USD', suppliers: [S.revzilla, S.jpcycles, S.amazonUS, S.ebayUS] },
  'Canada':         { currency: 'CAD', suppliers: [S.revzilla, S.amazonCA, S.jpcycles, S.ebayCA] },
  'Mexico':         { currency: 'MXN', suppliers: [S.mlMX, S.amazonMX, S.revzilla, S.ebayUS] },
  // UK & Ireland
  'United Kingdom': { currency: 'GBP', suppliers: [S.sportsbikeshop, S.amazonUK, S.ebayUK, S.fcMoto] },
  'Ireland':        { currency: 'EUR', suppliers: [S.sportsbikeshop, S.ebayIE, S.amazonUK, S.louis] },
  // Western Europe
  'Germany':        { currency: 'EUR', suppliers: [S.louis, S.fcMoto, S.amazonDE, S.ebayDE] },
  'France':         { currency: 'EUR', suppliers: [S.louis, S.fcMoto, S.amazonFR, S.ebayFR] },
  'Italy':          { currency: 'EUR', suppliers: [S.louis, S.fcMoto, S.amazonIT, S.ebayIT] },
  'Spain':          { currency: 'EUR', suppliers: [S.louis, S.fcMoto, S.amazonES, S.ebayES, S.motardinn] },
  'Portugal':       { currency: 'EUR', suppliers: [S.louis, S.fcMoto, S.amazonES, S.ebayES, S.motardinn] },
  'Netherlands':    { currency: 'EUR', suppliers: [S.louis, S.amazonNL, S.fcMoto, S.ebayDE] },
  'Belgium':        { currency: 'EUR', suppliers: [S.louis, S.amazonNL, S.amazonFR, S.fcMoto] },
  'Austria':        { currency: 'EUR', suppliers: [S.louis, S.amazonDE, S.fcMoto, S.ebayDE] },
  'Switzerland':    { currency: 'CHF', suppliers: [S.louis, S.fcMoto, S.amazonDE, S.ebayDE] },
  'Luxembourg':     { currency: 'EUR', suppliers: [S.louis, S.amazonDE, S.amazonFR, S.fcMoto] },
  // Northern Europe
  'Sweden':         { currency: 'SEK', suppliers: [S.xlmoto, S.louis, S.amazonSE, S.fcMoto] },
  'Norway':         { currency: 'NOK', suppliers: [S.xlmoto, S.louis, S.fcMoto, S.amazonDE] },
  'Denmark':        { currency: 'DKK', suppliers: [S.xlmoto, S.louis, S.fcMoto, S.amazonDE] },
  'Finland':        { currency: 'EUR', suppliers: [S.xlmoto, S.louis, S.fcMoto, S.amazonDE] },
  'Iceland':        { currency: 'ISK', suppliers: [S.louis, S.amazonUK, S.fcMoto, S.ebayUK] },
  // Eastern Europe
  'Poland':         { currency: 'PLN', suppliers: [S.louis, S.amazonPL, S.fcMoto, S.ebayDE] },
  'Czech Republic': { currency: 'CZK', suppliers: [S.louis, S.amazonDE, S.fcMoto, S.ebayDE] },
  'Romania':        { currency: 'RON', suppliers: [S.louis, S.amazonDE, S.fcMoto, S.ebayDE] },
  'Hungary':        { currency: 'HUF', suppliers: [S.louis, S.amazonDE, S.fcMoto, S.ebayDE] },
  'Croatia':        { currency: 'EUR', suppliers: [S.louis, S.amazonDE, S.fcMoto] },
  'Slovakia':       { currency: 'EUR', suppliers: [S.louis, S.amazonDE, S.fcMoto] },
  'Slovenia':       { currency: 'EUR', suppliers: [S.louis, S.amazonDE, S.fcMoto] },
  'Bulgaria':       { currency: 'BGN', suppliers: [S.louis, S.amazonDE, S.ebayDE] },
  'Greece':         { currency: 'EUR', suppliers: [S.louis, S.amazonDE, S.fcMoto, S.motardinn] },
  'Serbia':         { currency: 'RSD', suppliers: [S.louis, S.amazonDE, S.ebayDE] },
  'Ukraine':        { currency: 'UAH', suppliers: [S.louis, S.amazonDE, S.ebayDE] },
  'Russia':         { currency: 'RUB', suppliers: [S.ebayDE, S.amazonDE] },
  'Turkey':         { currency: 'TRY', suppliers: [S.louis, S.amazonDE, S.fcMoto, S.ebayDE] },
  // South Asia
  'India':          { currency: 'INR', suppliers: [S.amazonIN, S.grandPitStop, S.ebayUS] },
  'Pakistan':       { currency: 'PKR', suppliers: [S.amazonAE, S.ebayUS, S.amazonUK] },
  'Bangladesh':     { currency: 'BDT', suppliers: [S.amazonIN, S.ebayUS, S.lazada] },
  'Sri Lanka':      { currency: 'LKR', suppliers: [S.amazonIN, S.ebayUS, S.lazada] },
  'Nepal':          { currency: 'NPR', suppliers: [S.amazonIN, S.ebayUS] },
  // East Asia
  'Japan':          { currency: 'JPY', suppliers: [S.webikeJP, S.amazonJP, S.ebayUS] },
  'South Korea':    { currency: 'KRW', suppliers: [S.amazonJP, S.ebayUS, S.revzilla] },
  'Taiwan':         { currency: 'TWD', suppliers: [S.shopee, S.amazonJP, S.ebayUS] },
  'China':          { currency: 'CNY', suppliers: [S.amazonJP, S.ebayUS] },
  // Southeast Asia
  'Thailand':       { currency: 'THB', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Indonesia':      { currency: 'IDR', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Malaysia':       { currency: 'MYR', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Philippines':    { currency: 'PHP', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Vietnam':        { currency: 'VND', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Singapore':      { currency: 'SGD', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  'Cambodia':       { currency: 'USD', suppliers: [S.lazada, S.shopee, S.amazonSG, S.ebayUS] },
  // Oceania
  'Australia':      { currency: 'AUD', suppliers: [S.bikebiz, S.motoNational, S.amazonAU, S.ebayAU] },
  'New Zealand':    { currency: 'NZD', suppliers: [S.bikebiz, S.motoNational, S.amazonAU, S.ebayAU] },
  // Middle East
  'United Arab Emirates': { currency: 'AED', suppliers: [S.amazonAE, S.ebayUS] },
  'Saudi Arabia':   { currency: 'SAR', suppliers: [S.amazonSA, S.amazonAE, S.ebayUS] },
  'Israel':         { currency: 'ILS', suppliers: [S.amazonDE, S.ebayUS] },
  'Qatar':          { currency: 'QAR', suppliers: [S.amazonAE, S.ebayUS] },
  'Kuwait':         { currency: 'KWD', suppliers: [S.amazonAE, S.ebayUS] },
  'Oman':           { currency: 'OMR', suppliers: [S.amazonAE, S.ebayUS] },
  'Bahrain':        { currency: 'BHD', suppliers: [S.amazonAE, S.ebayUS] },
  'Jordan':         { currency: 'JOD', suppliers: [S.amazonAE, S.ebayUS] },
  'Lebanon':        { currency: 'USD', suppliers: [S.amazonAE, S.ebayUS] },
  // Africa
  'South Africa':   { currency: 'ZAR', suppliers: [S.amazonUK, S.ebayUK] },
  'Nigeria':        { currency: 'NGN', suppliers: [S.amazonUK, S.ebayUK, S.ebayUS] },
  'Kenya':          { currency: 'KES', suppliers: [S.amazonUK, S.ebayUK, S.ebayUS] },
  'Egypt':          { currency: 'EGP', suppliers: [S.amazonAE, S.ebayUS, S.amazonUK] },
  'Morocco':        { currency: 'MAD', suppliers: [S.amazonFR, S.louis, S.ebayFR] },
  'Tunisia':        { currency: 'TND', suppliers: [S.amazonFR, S.ebayFR] },
  'Tanzania':       { currency: 'TZS', suppliers: [S.amazonUK, S.ebayUK] },
  'Ghana':          { currency: 'GHS', suppliers: [S.amazonUK, S.ebayUK] },
  'Ethiopia':       { currency: 'ETB', suppliers: [S.amazonUK, S.ebayUK] },
  // South America
  'Brazil':         { currency: 'BRL', suppliers: [S.mlBR, S.amazonBR, S.ebayUS] },
  'Argentina':      { currency: 'ARS', suppliers: [S.mlAR, S.ebayUS, S.amazonUS] },
  'Colombia':       { currency: 'COP', suppliers: [S.mlCO, S.amazonUS, S.ebayUS] },
  'Chile':          { currency: 'CLP', suppliers: [S.mlCL, S.amazonUS, S.ebayUS] },
  'Peru':           { currency: 'PEN', suppliers: [S.mlMX, S.amazonUS, S.ebayUS] },
  'Ecuador':        { currency: 'USD', suppliers: [S.mlMX, S.amazonUS, S.ebayUS] },
  'Uruguay':        { currency: 'UYU', suppliers: [S.mlAR, S.amazonUS, S.ebayUS] },
  'Venezuela':      { currency: 'USD', suppliers: [S.mlMX, S.amazonUS, S.ebayUS] },
  'Costa Rica':     { currency: 'CRC', suppliers: [S.amazonUS, S.mlMX, S.ebayUS] },
  'Panama':         { currency: 'USD', suppliers: [S.amazonUS, S.mlMX, S.ebayUS] },
  'Dominican Republic': { currency: 'DOP', suppliers: [S.amazonUS, S.mlMX, S.ebayUS] },
};

function getSupplierPromptForCountry(country: string | undefined): string {
  const c = country || 'United States';
  const config = COUNTRY_SUPPLIERS[c] || COUNTRY_SUPPLIERS['United States'];

  const lines = config.suppliers.map((s, i) => {
    const pref = i === 0 ? ' (PREFERRED — ships fastest/cheapest to user)' : '';
    return `     - ${s.name}${pref}: ${s.url}`;
  });

  return `3. SUPPLIER & PRICING RULES (user is in ${c}):
   - All prices MUST be in ${config.currency}.
   - These are the retailers available in the user's region (for price reference):
${lines.join('\n')}
   - Set "supplier" to null and "url" to null — both will be resolved separately.
   - Focus on getting the right product, part number, and price. Do not worry about which supplier to assign.`;
}

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
  estimated_price: z.number().min(1, "Price must be at least 1"),
  supplier: z.string().nullable(),
  url: z.string().nullable(),
  search_query: z.string(),
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
    // Rate limit: max 5 per hour
    const ONE_HOUR = 60 * 60 * 1000;
    const recentCount = await ctx.runQuery(internal.rateLimit.checkRateLimit, {
      userId,
      action: "generateMaintenancePlan",
      windowMs: ONE_HOUR,
    });
    if (recentCount >= 5) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    await ctx.runMutation(internal.rateLimit.recordAction, {
      userId,
      action: "generateMaintenancePlan",
    });

    const openai = getOpenAIClient();

    // Step 1: Research bike specs via web search
    const bikeResearch = await researchBikeSpecs(openai, year, make, model);

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
   - MODERATE (worn but functional, should be addressed soon) → priority MEDIUM.
   - MINOR (slightly out of spec, cosmetic) → priority LOW.
4. You may add standard scheduled maintenance items (oil changes, valve checks, etc.) at their normal manufacturer intervals.
5. DEDUPLICATION: If an inspection item creates a critical/urgent task (e.g. brake pad replacement due now), do NOT also create a separate standard scheduled task for that same component. The critical task is the ONLY entry — the system will automatically project its next recurrence based on interval_months. Creating both a "replace brake pads now" AND a "scheduled brake pad replacement in 6 months" results in duplicates.
6. The system calculates due dates from interval_months + priority — you do NOT need to set due_date. Set it to null.`
      : "";

    const userPrompt = `You are an expert motorcycle mechanic. Generate a comprehensive maintenance plan for the following motorcycle:

Make: ${make}
Model: ${model}
Year: ${year}
Current Mileage: ${mileage} km
${lastServiceInfo}
${countryInfo}${riderContext}

VERIFIED BIKE SPECIFICATIONS (from web research — use these as ground truth):
${bikeResearch}
${noHistoryRule}${inspectionInfo}

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

TYPICAL INTERVAL RANGES (adjust based on rider profile + manufacturer specs):
- Tire pressure check: 0.5mo (biweekly)
- Chain clean/lube/tension: 0.5-1mo
- Visual safety check: 0.5-1mo
- Bike wash / corrosion rinse: 0.5-1mo (wet climate) or 1-2mo (dry)
- Engine oil + filter change: 3-6mo or 3000-6000km
- Brake inspection (pads, rotors, fluid level): 6-12mo
- Air filter inspection/cleaning: 6-12mo
- Coolant flush: 18-24mo
- Brake fluid replacement: 18-24mo
- Spark plugs: 12-24mo or 10000-20000km
- Valve clearance check: 12-24mo or 12000-25000km
- Fork oil change: 18-24mo
- Tire replacement: 12-24mo depending on wear
These are STARTING POINTS — the rider profile and bike specs should shift them. A sport rider in wet conditions gets shorter intervals.

Please provide a detailed maintenance plan that covers all recommended service intervals. For each task:
- Identify what needs to be done and why
- Specify service intervals (km and months) — EVERY task MUST have a positive interval_months value representing how often it should recur. Decimals are supported (0.5 = every 2 weeks, 1 = monthly, 3 = quarterly, 6 = biannual, 12 = annual, 24 = biennial). Even one-off repairs recur eventually — set a realistic re-inspection or replacement interval.
- Assign priority based on safety and mechanical necessity
- For estimated_cost_usd: estimate the DIY parts cost only — what it costs to buy the parts yourself, in the user's LOCAL currency (e.g. EUR for France, GBP for UK, USD for US, INR for India, etc.)
- For estimated_labor_cost_usd: estimate what a professional motorcycle mechanic shop in the user's country would charge for LABOR ONLY (not including parts) for this specific task. Use the average local motorcycle mechanic hourly rate for that country, in the user's LOCAL currency.
- List all parts that will be needed
- due_date: set to null — the system will calculate due dates automatically from interval_months. Focus on getting interval_months right for each task.

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

    // Calculate due dates deterministically from interval_months instead of trusting AI dates
    // Base date: last service date if available and valid, otherwise today
    let baseDate = new Date();
    if (lastServiceDate) {
      const parsed = new Date(lastServiceDate);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }

    const hasInspectionIssues = !!inspectionData;

    function calculateDueDate(intervalMonths: number, priority: string): string {
      // Only override interval for inspection-flagged urgent items
      if (hasInspectionIssues && priority === "critical") {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split("T")[0];
      }
      // Standard tasks: base date + interval_months
      const d = new Date(baseDate);
      if (intervalMonths < 1) {
        // Sub-monthly: add days (0.5 months = ~15 days)
        d.setDate(d.getDate() + Math.round(intervalMonths * 30));
      } else {
        d.setMonth(d.getMonth() + Math.round(intervalMonths));
      }
      // If calculated date is in the past, roll forward from today
      const now = new Date();
      if (d < now) {
        const fromNow = new Date();
        if (intervalMonths < 1) {
          fromNow.setDate(fromNow.getDate() + Math.round(intervalMonths * 30));
        } else {
          fromNow.setMonth(fromNow.getMonth() + Math.round(intervalMonths));
        }
        return fromNow.toISOString().split("T")[0];
      }
      return d.toISOString().split("T")[0];
    }

    function calculateDueMileage(intervalKm: number): number | undefined {
      if (intervalKm <= 0) return undefined;
      return mileage + intervalKm;
    }

    // Map parsed tasks — use AI intervals but calculate dates deterministically
    const tasks = parsed.tasks.map((t: TaskInput) => {
      const interval = t.interval_months > 0 ? t.interval_months : 6;
      const dueDate = calculateDueDate(interval, t.priority);
      const dueMileage = calculateDueMileage(t.interval_km);

      console.log(`[Plan] "${t.task}" interval=${interval}mo priority=${t.priority} → due=${dueDate}${dueMileage ? ` / ${dueMileage}km` : ""}`);

      return {
        name: t.task,
        description: t.description,
        intervalKm: t.interval_km > 0 ? t.interval_km : undefined,
        intervalMonths: interval,
        priority: t.priority,
        estimatedCostUsd: t.estimated_cost_usd > 0 ? t.estimated_cost_usd : undefined,
        estimatedLaborCostUsd: t.estimated_labor_cost_usd > 0 ? t.estimated_labor_cost_usd : undefined,
        dueDate,
        dueMileage,
        partsNeeded: t.parts_needed.length > 0 ? t.parts_needed : undefined,
      };
    });

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
        country,
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
    country: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { taskId, bikeId, userId, taskName, taskDescription, make, model, year, country }
  ): Promise<string[]> => {
    const openai = getOpenAIClient();

    // Step 1: Web research for exact part numbers and fitment
    const partsResearch = await researchPartsForTask(
      openai, year, make, model, taskName, country, taskDescription
    );

    const countryConfig = COUNTRY_SUPPLIERS[country || "United States"] || COUNTRY_SUPPLIERS["United States"];

    const descriptionInfo = taskDescription
      ? `\nTask Description: ${taskDescription}`
      : "";

    // Build country-aware supplier list
    const supplierPrompt = getSupplierPromptForCountry(country);

    const userPrompt = `What parts, consumables, and tools do I need to BUY to complete this maintenance task on my motorcycle?

Motorcycle: ${year} ${make} ${model}
User's Country: ${country || "United States"}
Maintenance Task: ${taskName}${descriptionInfo}

VERIFIED PARTS RESEARCH (from web search — THIS IS YOUR PRIMARY DATA SOURCE):
${partsResearch}

CRITICAL — YOU MUST FOLLOW THE RESEARCH ABOVE:
- The research contains a web-verified shopping list for this EXACT task on this EXACT bike.
- Use the SAME part numbers from the research. Do NOT substitute with different part numbers from your training data.
- Use the SAME prices from the research. Do NOT estimate or guess prices when real prices are provided above.
- Include ALL consumables and hardware the research lists — if the research says you need copper grease, brake cleaner, and a cotter pin, include ALL of them.
- Include the specialised tool the research recommends — if any.
- If the research specifies quantities (e.g. "1 set", "500ml", "2x"), reflect that in the product name.

You MUST respond using the structured format. Before listing parts, you MUST fill in the three reasoning fields:

1. "required_reasoning" — Quote what the research says is needed. What parts are physically consumed or replaced?
2. "consumable_reasoning" — Quote what the research says about consumables/hardware. List every single-use item: grease, fluid, washers, pins, threadlock, cleaner, etc. If the research lists it, include it.
3. "tool_reasoning" — Quote what the research says about tools. What specialised tool is recommended?

Then populate "parts" with ALL items from the research, categorised correctly.

RULES:

1. Categories:
   - "required" — The actual part being replaced/consumed. Mandatory to complete the task.
   - "consumable" — ALL single-use items and hardware: gaskets, crush washers, grease, brake cleaner, threadlock, cotter pins, O-rings, fluids used during the job, etc. Include EVERY consumable the research mentions.
   - "tool" — Specialised tools specific to THIS task (max 1-2). Rules:
     * NEVER basic hand tools: wrenches, sockets, socket sets, screwdrivers, pliers, hex keys, ratchets.
     * NEVER generic shop supplies: rags, shop towels, gloves, oil drain pans, jack stands.
     * ALWAYS recommend the CHEAPEST budget/DIY version of a tool — the kind a home mechanic would buy. For example: a simple syringe + one-way valve brake bleeder kit (~€10-15), NOT a MityVac or professional vacuum bleeder (~€50+). A basic feeler gauge set, NOT a professional digital gauge.
     * GOOD examples: syringe brake bleeder kit, brake piston wind-back tool, chain breaker/riveter, valve shim tool, feeler gauge set, spoke torque wrench.

2. Required parts: ONLY parts that are CONSUMED or REPLACED during this task.
   - NEVER pad the list with "while you're in there" extras beyond what the research specifies.

3. For each item:
   - "purpose": short lowercase label of WHAT it IS (e.g. "coolant", "oil filter", "crush washer", "radiator funnel kit"). Two items with the same purpose = duplicate, one gets removed.
   - Recommend a specific product/brand (e.g. "Motul RBF 600 DOT 4 Brake Fluid 500ml").
   - FITMENT CRITICAL: Use the VERIFIED PARTS RESEARCH above as your primary source for part numbers. The research contains web-verified part numbers for this exact ${year} ${make} ${model}. If the research provides a part number, USE IT. Only set part_number to null if the research has no data for that specific part AND you are not confident from training data.
   - The "name" field must be a CLEAN product name only (e.g. "EBC Double-H Sintered Rear Brake Pads"). NEVER put disclaimers, fitment warnings, or notes in the name.
   - "search_query": a SHORT search string to find this product on a retail site. Use brand + aftermarket part number (NOT long OEM numbers). Examples: "EBC FA174HH brake pads", "Motul 7100 10W40 1L". OEM part numbers like "69100-17G21-999" do NOT work as search queries — use the aftermarket equivalent instead. Keep under 6-8 words.
   - PRICING: You MUST copy the exact price from the VERIFIED PARTS RESEARCH above. Scan the research text for the price of each item and use that number. If the research says "€23" for brake pads, the estimated_price MUST be 23, not 38 or 48. If the research has no explicit price for a specific item, you MUST still provide a reasonable estimate based on your knowledge — estimated_price can NEVER be 0. Every part must have a price >= 1.
   - SUPPLIER: Use whichever approved supplier below has the best price/availability for each item. Different items can come from different suppliers.
${supplierPrompt}

4. NO DUPLICATES: One product per part type. Multiple DIFFERENT parts are fine (oil + filter + washer), but never two brands of the same thing.

5. NO KITS THAT DUPLICATE INDIVIDUAL PARTS: If you are already listing individual parts (e.g. brake pads, grease, brake fluid), do NOT also add a "rebuild kit" or "service kit" that contains those same items. Choose ONE approach: either list the kit alone, OR list individual parts — never both. Prefer individual parts since the user can choose brands.

6. LOGICAL CONSISTENCY — think critically:
   - Premixed coolant (50/50, ready-to-use)? Do NOT add distilled water.
   - Complete oil product? Don't add additives.
   - A caliper rebuild kit is NOT needed for a basic brake pad replacement — only include it if the research specifically says the calipers need rebuilding.
   - Ask for EVERY item: "Does the user actually need to buy this given what else is in the list?"

7. FINAL CHECK: Remove anything that fails: not genuinely needed, illogical with other items, duplicate, or a kit that overlaps with individual parts already listed.`;

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
      // Remove generic household items that aren't motorcycle-specific
      if (/\b(nitrile gloves?|latex gloves?|disposable gloves?|rubber gloves?|cleaning cloth|microfiber cloth|shop towel|paper towel|rag|rags\b|zip.?ties?|cable ties?|duct tape|masking tape|bucket|container|tray|newspaper|cardboard|plastic bag)/i.test(lower)) {
        console.log(`[Parts Logic] Removed "${p.name}" — generic household item, not motorcycle-specific`);
        return false;
      }
      // Remove large equipment / garage tools that aren't task-specific parts
      if (/\b(paddock stand|rear stand|front stand|bike stand|motorcycle stand|bike lift|motorcycle lift|torque wrench|work.?stand)\b/i.test(lower)) {
        console.log(`[Parts Logic] Removed "${p.name}" — large equipment, not a task-specific part`);
        return false;
      }
      return true;
    });

    console.log(`[Parts] AI: ${parsed.parts.length} → dedup: ${dedupedParts.length} → logic: ${logicFiltered.length}`);
    const finalParts = logicFiltered;

    // ── URL + Price strategy ──
    // Prices come from the research step. If any parts have no price (0),
    // run a fallback lookup for just those parts.

    // Collect reliable marketplace suppliers (Amazon, eBay) for Buy links
    const marketplaceSuppliers = countryConfig.suppliers.filter((s) => {
      const n = s.name.toLowerCase();
      return n.includes("amazon") || n.includes("ebay");
    });
    const buySuppliers = marketplaceSuppliers.length > 0 ? marketplaceSuppliers : countryConfig.suppliers;
    console.log(`[Buy Links] Using ${buySuppliers.map(s => s.name).join(", ")} for Buy URLs (${country})`);

    // Assign each part a supplier via round-robin
    const partSupplierAssignments = finalParts.map((_, i) => buySuppliers[i % buySuppliers.length]);

    // Fallback: look up prices for any parts that have no price from research
    const missingPriceParts = finalParts
      .map((p, i) => ({ ...p, idx: i }))
      .filter((p) => !p.estimated_price || p.estimated_price <= 0);

    let fallbackPrices = new Map<string, number>();
    if (missingPriceParts.length > 0) {
      console.log(`[Price] ${missingPriceParts.length}/${finalParts.length} parts have no research price — running fallback lookup...`);
      fallbackPrices = await lookupPrices(
        openai,
        missingPriceParts.map((p) => ({
          search_query: p.search_query,
          name: p.name,
          retailer: partSupplierAssignments[p.idx].name,
        })),
        countryConfig.currency
      );
    }

    // Append affiliate tags to URLs before saving
    const amazonTag = process.env.AMAZON_AFFILIATE_TAG;
    const revzillaTag = process.env.REVZILLA_AFFILIATE_TAG;
    const jpcyclesTag = process.env.JPCYCLES_AFFILIATE_TAG;

    function addAffiliateTag(url: string): string {
      try {
        const u = new URL(url);
        if (u.hostname.includes("amazon") && amazonTag) {
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

    // Map parts to save format — each part gets its assigned supplier's search URL
    const partsToSave = finalParts.map((p: PartInput, i: number) => {
      const supplier = partSupplierAssignments[i];
      const encoded = encodeURIComponent(p.search_query);
      const finalUrl = supplier.url.replace("SEARCH_TERMS", encoded);

      // Use research price; fall back to lookup if research gave 0
      let finalPrice = p.estimated_price;
      if (!finalPrice || finalPrice <= 0) {
        const lookupPrice = fallbackPrices.get(p.search_query.toLowerCase());
        if (lookupPrice && lookupPrice > 0) {
          finalPrice = lookupPrice;
        }
      }
      console.log(`[Price] "${p.name}" search="${p.search_query}" | Research=${p.estimated_price} → Final=${finalPrice} | Buy→${supplier.name}`);

      return {
        taskId,
        bikeId,
        userId,
        name: p.name,
        partNumber: p.part_number ?? undefined,
        estimatedPrice: finalPrice,
        supplier: supplier.name,
        url: addAffiliateTag(finalUrl),
        category: p.category,
      };
    });

    // Save parts to the database
    const insertedIds: string[] = await ctx.runMutation(internal.parts.saveParts, {
      parts: partsToSave,
    });

    return insertedIds;
  },
});

// ─── AI Hero Image Generation ───────────────────────────────────
// Takes user's bike photo + 2 reference images → generates a cinematic hero image
// Only triggered during onboarding

export const generateHeroImage = internalAction({
  args: {
    bikeId: v.id("bikes"),
    photoStorageId: v.id("_storage"),
  },
  handler: async (ctx, { bikeId, photoStorageId }) => {
    // Rate limit: max 5 per hour per user
    const bike = await ctx.runQuery(internal.crons.getBike, { bikeId });
    if (bike) {
      const ONE_HOUR = 60 * 60 * 1000;
      const recentCount = await ctx.runQuery(internal.rateLimit.checkRateLimit, {
        userId: bike.userId,
        action: "generateHeroImage",
        windowMs: ONE_HOUR,
      });
      if (recentCount >= 5) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      await ctx.runMutation(internal.rateLimit.recordAction, {
        userId: bike.userId,
        action: "generateHeroImage",
      });
    }

    const openai = getOpenAIClient();

    // 1. Fetch the user's uploaded bike photo from Convex storage
    const userPhotoUrl = await ctx.storage.getUrl(photoStorageId);
    if (!userPhotoUrl) {
      console.error("[AI Hero] Could not get URL for user photo");
      return;
    }

    // 2. Get reference images from Convex storage via storage IDs in env vars
    const bgStorageId = process.env.HERO_REF_BACKGROUND_STORAGE_ID;
    const sizingStorageId = process.env.HERO_REF_SIZING_STORAGE_ID;
    if (!bgStorageId || !sizingStorageId) {
      console.error("[AI Hero] Reference image storage IDs not configured. Set HERO_REF_BACKGROUND_STORAGE_ID and HERO_REF_SIZING_STORAGE_ID env vars.");
      return;
    }

    const backgroundUrl = await ctx.storage.getUrl(bgStorageId as any);
    const sizingUrl = await ctx.storage.getUrl(sizingStorageId as any);
    if (!backgroundUrl || !sizingUrl) {
      console.error("[AI Hero] Could not get URLs for reference images");
      return;
    }

    // 3. Fetch all images and convert to base64 data URLs
    const [userPhotoResp, bgResp, sizingResp] = await Promise.all([
      fetch(userPhotoUrl),
      fetch(backgroundUrl),
      fetch(sizingUrl),
    ]);

    const toBase64DataUrl = async (resp: Response) => {
      const buffer = Buffer.from(await resp.arrayBuffer());
      return `data:image/png;base64,${buffer.toString("base64")}`;
    };

    const userPhotoB64 = await toBase64DataUrl(userPhotoResp);
    const bgB64 = await toBase64DataUrl(bgResp);
    const sizingB64 = await toBase64DataUrl(sizingResp);

    console.log("[AI Hero] Generating hero image via responses API...");

    try {
      // 4. Use the responses API with image generation — handles multi-image input
      const response: any = await (openai.responses as any).create({
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: [
              { type: "input_image", image_url: userPhotoB64 },
              { type: "input_image", image_url: bgB64 },
              { type: "input_image", image_url: sizingB64 },
              {
                type: "input_text",
                text: "Put the bike from the first image into the background of the second image as a PERFECT 90-DEGREE SIDE VIEW. The bike must face the same direction as in the first image (if it points right, output points right). Make the bike slightly smaller than in the third image. Position the bike close to the concrete wall behind it — the tires should be on the road surface near the wall, not in the middle of the road. The bike must look exactly like the original — same color, same fairings, same exhaust, same wheels. IMPORTANT: Do NOT add, draw, or create any new white road markings or lines. The background already has one white line — keep ONLY that one. Do not duplicate it or add another one below it. Keep the background EXACTLY as-is.",
              },
            ],
          },
        ],
        tools: [{ type: "image_generation", size: "1536x1024" }],
      });

      // Find the generated image in the output
      const imageOutput = response.output.find(
        (item: any) => item.type === "image_generation_call"
      );

      if (!imageOutput || !(imageOutput as any).result) {
        console.error("[AI Hero] No image data in response");
        return;
      }

      // 5. Convert base64 to buffer and upload to Convex storage
      const imageBuffer = Buffer.from((imageOutput as any).result, "base64");
      const blob = new Blob([imageBuffer], { type: "image/png" });
      const storageId = await ctx.storage.store(blob);
      const heroUrl = await ctx.storage.getUrl(storageId);

      if (!heroUrl) {
        console.error("[AI Hero] Could not get URL for generated image");
        return;
      }

      // 6. Update the bike's heroImageUrl
      await ctx.runMutation(internal.bikes.setHeroImage, {
        bikeId,
        heroImageUrl: heroUrl,
      });

      console.log("[AI Hero] Hero image generated and saved successfully");
    } catch (error: any) {
      console.error("[AI Hero] Image generation failed:", error?.message || error);
    }
  },
});
