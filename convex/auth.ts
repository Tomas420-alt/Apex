import { convexAuth } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import Google from "@auth/core/providers/google";
import { internal } from "./_generated/api";
import { jwtVerify, createRemoteJWKSet } from "jose";

// Apple's public JWKS endpoint for verifying identity tokens
const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

// Custom Apple provider that accepts native identity tokens from expo-apple-authentication.
// The native iOS flow returns a JWT which we verify against Apple's public keys,
// then find-or-create a user in the Convex database.
const NativeApple = ConvexCredentials({
  id: "apple",
  authorize: async (credentials, ctx) => {
    const token = credentials.token as string;
    const name = (credentials.name as string) || undefined;
    const email = (credentials.email as string) || undefined;

    if (!token) {
      throw new Error("Missing Apple identity token");
    }

    // Verify the Apple identity token JWT against Apple's public keys
    const { payload } = await jwtVerify(token, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: process.env.AUTH_APPLE_CLIENT_ID,
    });

    const appleUserId = payload.sub;
    if (!appleUserId) {
      throw new Error("Invalid Apple token: missing subject");
    }

    const userEmail = email || (payload.email as string) || undefined;

    // Find or create the user in the database
    const userId = await ctx.runMutation(
      internal.authHelpers.findOrCreateAppleUser,
      { appleUserId, email: userEmail, name },
    );

    return { userId };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    NativeApple,
    Google,
  ],
  callbacks: {
    // Allow the native app scheme for OAuth redirects back to the mobile app
    async redirect({ redirectTo }) {
      // Allow app scheme redirects (apextune://) for React Native OAuth flow
      if (redirectTo.startsWith("apextune://")) {
        return redirectTo;
      }
      // Default: allow same-site redirects
      const siteUrl = process.env.SITE_URL?.replace(/\/$/, "") ?? "";
      if (redirectTo.startsWith("/") || redirectTo.startsWith("?")) {
        return `${siteUrl}${redirectTo}`;
      }
      if (redirectTo.startsWith(siteUrl)) {
        return redirectTo;
      }
      return siteUrl;
    },
  },
});
