/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as bikes from "../bikes.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as imageEditActions from "../imageEditActions.js";
import type * as imageEdits from "../imageEdits.js";
import type * as inspection from "../inspection.js";
import type * as inspectionMutations from "../inspectionMutations.js";
import type * as maintenancePlans from "../maintenancePlans.js";
import type * as maintenanceTasks from "../maintenanceTasks.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as parts from "../parts.js";
import type * as rateLimit from "../rateLimit.js";
import type * as reminders from "../reminders.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  bikes: typeof bikes;
  crons: typeof crons;
  http: typeof http;
  imageEditActions: typeof imageEditActions;
  imageEdits: typeof imageEdits;
  inspection: typeof inspection;
  inspectionMutations: typeof inspectionMutations;
  maintenancePlans: typeof maintenancePlans;
  maintenanceTasks: typeof maintenanceTasks;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  parts: typeof parts;
  rateLimit: typeof rateLimit;
  reminders: typeof reminders;
  subscriptions: typeof subscriptions;
  users: typeof users;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
