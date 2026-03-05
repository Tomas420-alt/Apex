# OpenAI Structured Outputs & Function Calling

## Overview

OpenAI Structured Outputs guarantee that GPT-4o model responses exactly match a supplied JSON Schema. This is used for maintenance plan generation with structured JSON outputs, function calling for bike spec extraction, and parts list generation. Two mechanisms are available: **response_format** (for structured responses to the user) and **function calling with strict mode** (for structured tool invocations).

Structured Outputs achieve 100% schema compliance via constrained decoding — a deterministic, engineering-based approach that constrains the model's token generation at inference time.

## Installation

```bash
npm install openai zod
```

- `openai` — Official OpenAI Node.js/TypeScript SDK
- `zod` — Schema declaration and validation (used by SDK helpers)

## Configuration

### Environment Variables

```bash
OPENAI_API_KEY=sk-...   # Required. OpenAI API key
```

Add to `.env.local`:
```
OPENAI_API_KEY=sk-your-key-here
```

Add to `.env.example`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

### Initialization

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

## Key Patterns

### Pattern 1: Structured Response with Zod (Recommended)

Use `zodResponseFormat` and `beta.chat.completions.parse()` for typed, validated responses.

```typescript
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

// Define the schema
const MaintenancePlan = z.object({
  bike_name: z.string(),
  tasks: z.array(
    z.object({
      task: z.string(),
      interval_km: z.number(),
      priority: z.enum(["low", "medium", "high", "critical"]),
      estimated_cost_usd: z.number(),
      parts_needed: z.array(z.string()),
    })
  ),
  total_estimated_cost: z.number(),
  next_service_date: z.string(),
});

const client = new OpenAI();

const completion = await client.beta.chat.completions.parse({
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content:
        "You are a bike maintenance expert. Generate a maintenance plan based on the bike specs provided.",
    },
    {
      role: "user",
      content: "Generate a maintenance plan for a 2023 Trek Domane SL5 with 3,200km on the odometer.",
    },
  ],
  response_format: zodResponseFormat(MaintenancePlan, "maintenance_plan"),
});

const message = completion.choices[0]?.message;

// Always check for refusals first
if (message?.refusal) {
  console.error("Model refused:", message.refusal);
} else if (message?.parsed) {
  // Fully typed — TypeScript knows the shape
  console.log(message.parsed.tasks);
  console.log(`Total cost: $${message.parsed.total_estimated_cost}`);
}
```

### Pattern 2: Raw JSON Schema (No Zod)

When you need to pass a raw JSON Schema directly (e.g., schema stored in DB or config).

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: "Extract bike specifications from the text." },
    { role: "user", content: userInput },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "bike_specs",
      strict: true,
      schema: {
        type: "object",
        properties: {
          brand: { type: "string" },
          model: { type: "string" },
          year: { type: "number" },
          frame_material: {
            type: "string",
            enum: ["carbon", "aluminum", "steel", "titanium"],
          },
          groupset: { type: "string" },
          wheel_size: { type: "string" },
        },
        required: [
          "brand",
          "model",
          "year",
          "frame_material",
          "groupset",
          "wheel_size",
        ],
        additionalProperties: false,
      },
    },
  },
});

const bikeSpecs = JSON.parse(completion.choices[0].message.content!);
```

### Pattern 3: Function Calling with Strict Mode

Use `zodFunction` to define tools with automatic argument parsing.

```typescript
import OpenAI from "openai";
import { zodFunction } from "openai/helpers/zod";
import { z } from "zod";

// Define function parameter schemas
const BikeSpecParams = z.object({
  brand: z.string(),
  model: z.string(),
  year: z.number(),
  component_group: z.string(),
});

const PartsListParams = z.object({
  bike_id: z.string(),
  service_type: z.enum(["basic", "intermediate", "full"]),
  include_labor: z.boolean(),
});

const client = new OpenAI();

const completion = await client.beta.chat.completions.parse({
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content:
        "You help users find bike specs and generate parts lists. Call the appropriate function.",
    },
    {
      role: "user",
      content: "I need parts for a full service on bike #TRK-2023-001",
    },
  ],
  tools: [
    zodFunction({
      name: "get_bike_specs",
      description: "Look up bike specifications by brand, model, and year",
      parameters: BikeSpecParams,
    }),
    zodFunction({
      name: "generate_parts_list",
      description:
        "Generate a parts list for a service based on bike ID and service type",
      parameters: PartsListParams,
    }),
  ],
  tool_choice: "auto", // or "required" to force a function call
  parallel_tool_calls: false, // Required when using strict mode
});

// Handle tool calls
const message = completion.choices[0]?.message;
if (message.tool_calls) {
  for (const toolCall of message.tool_calls) {
    const args = toolCall.function.parsed_arguments;
    console.log(`Function: ${toolCall.function.name}`);
    console.log(`Args:`, args); // Already parsed and typed
  }
}
```

### Pattern 4: Function Calling Loop (Complete Flow)

The full round-trip: call model -> execute function -> return results -> get final response.

```typescript
import OpenAI from "openai";
import { zodFunction } from "openai/helpers/zod";
import { z } from "zod";

const PartsLookupParams = z.object({
  component_type: z.string(),
  bike_model: z.string(),
  compatibility_year: z.number(),
});

// Your actual function implementations
async function lookupParts(args: z.infer<typeof PartsLookupParams>) {
  // Real database/API call here
  return {
    parts: [
      { name: "Chain", sku: "SHM-CN-HG601", price: 24.99 },
      { name: "Brake Pads", sku: "SHM-BP-L03A", price: 18.5 },
    ],
  };
}

const tools = [
  zodFunction({
    name: "lookup_parts",
    description: "Look up compatible parts for a specific bike model",
    parameters: PartsLookupParams,
  }),
];

const client = new OpenAI();
const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  { role: "system", content: "You are a bike parts advisor." },
  { role: "user", content: "What chain do I need for a 2023 Trek Domane?" },
];

// Step 1: Initial call — model decides to call a function
const response = await client.beta.chat.completions.parse({
  model: "gpt-4o",
  messages,
  tools,
});

const assistantMessage = response.choices[0].message;
messages.push(assistantMessage); // Add assistant response to history

// Step 2: Execute each tool call and return results
if (assistantMessage.tool_calls) {
  for (const toolCall of assistantMessage.tool_calls) {
    let result: unknown;

    if (toolCall.function.name === "lookup_parts") {
      result = await lookupParts(
        toolCall.function.parsed_arguments as z.infer<typeof PartsLookupParams>
      );
    }

    // Add tool result to message history
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }

  // Step 3: Get final response with tool results
  const finalResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
  });

  console.log(finalResponse.choices[0].message.content);
}
```

## API Reference

| Method / Helper | Description | Import |
|---|---|---|
| `client.beta.chat.completions.parse()` | Chat completion with automatic response parsing via Zod | `openai` |
| `client.chat.completions.create()` | Standard chat completion (use with raw JSON schema) | `openai` |
| `zodResponseFormat(schema, name)` | Convert Zod schema to `response_format` parameter | `openai/helpers/zod` |
| `zodFunction({ name, description, parameters })` | Convert Zod schema to a tool function definition with `strict: true` | `openai/helpers/zod` |

### `tool_choice` Options

| Value | Behavior |
|---|---|
| `"auto"` | Model decides whether to call a function (default) |
| `"required"` | Model must call at least one function |
| `"none"` | Model must not call any function |
| `{ type: "function", function: { name: "fn_name" } }` | Force a specific function |

### Response Fields

| Field | Description |
|---|---|
| `message.parsed` | Typed parsed object (only with `.parse()`) |
| `message.refusal` | String if model refused the request for safety reasons |
| `message.content` | Raw JSON string of the response |
| `message.tool_calls[].function.parsed_arguments` | Typed parsed arguments (only with `.parse()` + `zodFunction`) |
| `message.tool_calls[].function.name` | Name of the called function |
| `message.tool_calls[].id` | Unique ID to match tool results back |

## Schema Constraints (Strict Mode)

When using `strict: true` (which `zodResponseFormat` and `zodFunction` enable automatically), schemas must comply with these rules:

| Constraint | Requirement |
|---|---|
| `additionalProperties` | Must be `false` on every object node |
| `required` | All properties must be listed as required |
| Optional fields | Use union with `null` (e.g., `z.string().nullable()`) |
| Max nesting depth | 5 levels |
| Max total properties | 100 across entire schema |
| Recursive schemas | Not supported |
| Unsupported keywords | `minLength`, `maxLength`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `pattern`, `format` |
| Root type | Must be `object` (not array or primitive) |

### Zod to Nullable Pattern

```typescript
// Wrong — "optional" is not supported in strict mode
z.object({ notes: z.string().optional() }); // Will fail

// Correct — use nullable instead
z.object({ notes: z.string().nullable() }); // Outputs: "type": ["string", "null"]
```

## Gotchas

1. **Always check `message.refusal`** — The model may refuse requests for safety reasons. A refusal does not follow your schema, so parsing it will fail. Always check `message.refusal` before accessing `message.parsed`.

2. **`additionalProperties: false` is mandatory** — Every object node in your schema must set this. The Zod helpers handle this automatically, but raw JSON schemas must include it manually on every nested object.

3. **All fields must be `required`** — Strict mode does not support optional properties. Use `.nullable()` in Zod to express optional fields.

4. **No `parallel_tool_calls` with strict mode** — When using structured outputs with function calling, set `parallel_tool_calls: false`. Structured outputs are not compatible with parallel function calls.

5. **First request with a new schema is slower** — OpenAI compiles and caches the constrained decoding grammar for each unique schema. The first request with a new schema incurs additional latency; subsequent requests are faster.

6. **Max 100 properties total** — This is across the entire schema (all nested objects combined), not per object. Plan flat schemas for complex outputs.

7. **5 levels of nesting max** — Deeply nested schemas will be rejected. Flatten your data structures if needed.

8. **Validation keywords are ignored** — `minLength`, `maximum`, `pattern`, `format`, etc. are silently ignored in strict mode. Do not rely on them — validate in your application code after parsing.

9. **`.parse()` throws on `length` or `content_filter` finish reasons** — If the response is truncated due to token limits or content filtering, the parse method throws an error. Wrap in try/catch.

10. **Structured outputs may slightly reduce reasoning quality** — Research suggests constrained decoding can marginally reduce LLM reasoning capability compared to free-form responses. For complex reasoning tasks, consider using a chain: first get free-form reasoning, then extract structured data in a second call.

## Supported Models

| Model | `response_format: json_schema` | Function Calling (strict) |
|---|---|---|
| `gpt-4o` (latest) | Yes | Yes |
| `gpt-4o-2024-08-06`+ | Yes | Yes |
| `gpt-4o-mini` | Yes | Yes |
| `gpt-4.1` | Yes | Yes |
| `gpt-4.1-mini` | Yes | Yes |
| `gpt-4.1-nano` | Yes | Yes |

## Rate Limits & Pricing

### GPT-4o Pricing
| | Cost |
|---|---|
| Input tokens | $2.50 / 1M tokens |
| Output tokens | $10.00 / 1M tokens |

### GPT-4o-mini Pricing
| | Cost |
|---|---|
| Input tokens | $0.15 / 1M tokens |
| Output tokens | $0.60 / 1M tokens |

Rate limits vary by account tier. Check your dashboard at [platform.openai.com/settings/limits](https://platform.openai.com/settings/limits).

**Recommendation for this project**: Use `gpt-4o-mini` for straightforward extraction tasks (bike specs, parts lists) and `gpt-4o` for complex generation tasks (maintenance plan reasoning). This balances cost and quality.

## References

- [Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI Node.js SDK Helpers](https://github.com/openai/openai-node/blob/master/helpers.md)
- [Introducing Structured Outputs (Blog)](https://openai.com/index/introducing-structured-outputs-in-the-api/)
- [API Pricing](https://openai.com/api/pricing/)
- [Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
