import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  LinearTransition,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuthActions } from "@convex-dev/auth/react";
import { colors } from "@/constants/theme";

export default function SignInScreen() {
  const { signIn } = useAuthActions();
  const [loading, setLoading] = useState<"apple" | "google" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Native Apple Sign In — uses Face ID / Touch ID sheet on iOS
  const handleAppleSignIn = async () => {
    setLoading("apple");
    setErrorMessage("");

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token returned from Apple");
      }

      // Pass the Apple identity token to Convex Auth
      await signIn("apple", {
        token: credential.identityToken,
        name: credential.fullName
          ? `${credential.fullName.givenName ?? ""} ${credential.fullName.familyName ?? ""}`.trim()
          : undefined,
        email: credential.email ?? undefined,
      });

      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      if (err.code === "ERR_REQUEST_CANCELED") {
        setLoading(null);
        return;
      }
      if (__DEV__) console.error("Apple sign in error:", err);
      setErrorMessage("Apple sign in failed. Please try again.");
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(null);
    }
  };

  // Google Sign In — uses web redirect flow via Convex Auth
  const handleGoogleSignIn = async () => {
    setLoading("google");
    setErrorMessage("");

    try {
      // Pass redirectTo so the OAuth callback redirects back to the native app
      const redirectUri = "apextune://auth/callback";
      const { redirect } = await signIn("google", { redirectTo: redirectUri });

      if (redirect) {
        // Open Google consent screen; listen for our app scheme redirect
        const result = await WebBrowser.openAuthSessionAsync(
          redirect.toString(),
          redirectUri,
        );

        if (result.type === "success" && result.url) {
          // Extract the code from the callback URL and complete auth
          const url = new URL(result.url);
          const code = url.searchParams.get("code") || url.hash?.match(/code=([^&]+)/)?.[1];
          if (code) {
            await signIn("google", { code });
          }
        } else if (result.type === "cancel" || result.type === "dismiss") {
          setLoading(null);
          return;
        }
      }

      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      if (__DEV__) console.error("Google sign in error:", err);
      const raw = err?.message?.toLowerCase() ?? "";
      let message = "Google sign in failed. Please try again.";
      if (raw.includes("network") || raw.includes("connect")) {
        message = "Unable to connect. Please check your internet connection.";
      } else if (raw.includes("cancel")) {
        setLoading(null);
        return;
      }
      setErrorMessage(message);
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28 }}>
        {/* Brand mark */}
        <Animated.View
          entering={FadeIn.duration(600)}
          style={{ alignItems: "center", marginBottom: 48 }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              borderCurve: "continuous",
              backgroundColor: "rgba(0,242,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "rgba(0,242,255,0.2)",
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: "800", color: colors.green }}>
              A
            </Text>
          </View>
          <Text
            style={{
              fontSize: 34,
              fontWeight: "800",
              fontStyle: "italic",
              color: colors.textPrimary,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            APEXTUNE
          </Text>
          <Text
            style={{
              fontSize: 17,
              color: colors.textSecondary,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Sign in to start tracking your bike
          </Text>
        </Animated.View>

        {/* Error message */}
        {errorMessage ? (
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            layout={LinearTransition}
            style={{
              backgroundColor: "rgba(255, 107, 107, 0.1)",
              borderRadius: 12,
              borderCurve: "continuous",
              padding: 14,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "rgba(255, 107, 107, 0.25)",
            }}
          >
            <Text
              selectable
              style={{
                color: colors.red,
                fontSize: 14,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              {errorMessage}
            </Text>
          </Animated.View>
        ) : null}

        {/* Auth buttons */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={{ gap: 14 }}
        >
          {/* Native Apple Sign In — system Face ID / Touch ID sheet on iOS */}
          {Platform.OS === "ios" ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={14}
              style={{ height: 52 }}
              onPress={handleAppleSignIn}
            />
          ) : (
            <Pressable
              onPress={handleAppleSignIn}
              disabled={loading !== null}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                borderCurve: "continuous",
                paddingVertical: 16,
                opacity: loading === "apple" ? 0.6 : pressed ? 0.85 : 1,
              })}
            >
              {loading === "apple" ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={{ color: "#000", fontSize: 17, fontWeight: "600" }}>
                  Sign in with Apple
                </Text>
              )}
            </Pressable>
          )}

          {/* Sign in with Google — web redirect */}
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={loading !== null}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              backgroundColor: colors.surface2,
              borderRadius: 14,
              borderCurve: "continuous",
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: loading === "google" ? 0.6 : pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            {loading === "google" ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}>G</Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: 17,
                    fontWeight: "600",
                    letterSpacing: -0.2,
                  }}
                >
                  Sign in with Google
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Loading indicator */}
        {loading && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={{ alignItems: "center", marginTop: 24 }}
          >
            <ActivityIndicator color={colors.green} />
          </Animated.View>
        )}

        {/* Terms */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          style={{ marginTop: 32, alignItems: "center" }}
        >
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 12,
              textAlign: "center",
              lineHeight: 18,
              paddingHorizontal: 16,
            }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
