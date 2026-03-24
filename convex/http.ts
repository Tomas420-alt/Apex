import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { revenuecatWebhook } from "./webhooks";

const http = httpRouter();

auth.addHttpRoutes(http);

// RevenueCat server-to-server webhook for subscription lifecycle events
http.route({
  path: "/webhooks/revenuecat",
  method: "POST",
  handler: revenuecatWebhook,
});

export default http;