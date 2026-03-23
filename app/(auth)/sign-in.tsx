import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedKeyboard,
  useAnimatedStyle,
  LinearTransition,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "expo-router";
import { colors } from "@/constants/theme";

export default function SignInScreen() {
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const keyboard = useAnimatedKeyboard();
  const keyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value,
  }));

  const onSignInPress = async () => {
    if (!email || !password) {
      setErrorMessage("Please enter your email and password.");
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      await signIn("password", { email, password, flow: "signIn" });
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      console.error("Sign in error:", err);
      const raw = err?.message?.toLowerCase() ?? "";
      let message = "Sign in failed. Please check your credentials.";
      if (raw.includes("invalid") || raw.includes("secret") || raw.includes("credentials")) {
        message = "Incorrect email or password. Please try again.";
      } else if (raw.includes("not found") || raw.includes("no user")) {
        message = "No account found with this email. Please sign up first.";
      } else if (raw.includes("network") || raw.includes("connect")) {
        message = "Unable to connect. Please check your internet connection.";
      }
      setErrorMessage(message);
      if (process.env.EXPO_OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <Animated.View
        style={[{ flex: 1, backgroundColor: colors.bg }, keyboardStyle]}
      >
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
                backgroundColor: "rgba(0, 229, 153, 0.12)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                borderWidth: 1,
                borderColor: "rgba(0, 229, 153, 0.2)",
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
                color: colors.textPrimary,
                letterSpacing: -0.5,
              }}
            >
              Welcome back
            </Text>
            <Text
              style={{
                fontSize: 17,
                color: colors.textSecondary,
                marginTop: 8,
              }}
            >
              Sign in to your Apex account
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

          {/* Form fields */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={{ gap: 14 }}
          >
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Email
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.surface1,
                  borderRadius: 14,
                  borderCurve: "continuous",
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  fontSize: 17,
                  color: colors.textPrimary,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
              />
            </View>

            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Password
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.surface1,
                  borderRadius: 14,
                  borderCurve: "continuous",
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  fontSize: 17,
                  color: colors.textPrimary,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                placeholder="Enter your password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={onSignInPress}
              />
            </View>
          </Animated.View>

          {/* Sign in button */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Pressable
              onPress={onSignInPress}
              disabled={loading}
              style={({ pressed }) => ({
                backgroundColor: colors.green,
                borderRadius: 14,
                borderCurve: "continuous",
                paddingVertical: 18,
                alignItems: "center",
                marginTop: 24,
                opacity: loading ? 0.6 : pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                boxShadow: "0 4px 16px rgba(0, 229, 153, 0.3)",
              })}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 17,
                    fontWeight: "700",
                    letterSpacing: -0.2,
                  }}
                >
                  Sign In
                </Text>
              )}
            </Pressable>
          </Animated.View>

          {/* Footer */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(500)}
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 28,
              gap: 4,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
              Don&apos;t have an account?
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable hitSlop={8}>
                <Text
                  style={{
                    color: colors.green,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  Sign Up
                </Text>
              </Pressable>
            </Link>
          </Animated.View>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
