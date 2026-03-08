import React from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform, View, Text, StyleSheet } from "react-native";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const isConvexConfigured = convexUrl && convexUrl.startsWith("https://");

const convex = isConvexConfigured ? new ConvexReactClient(convexUrl) : null;

const storage = Platform.OS === "web"
  ? undefined
  : {
      getItem: async (key: string) => {
        try {
          return await SecureStore.getItemAsync(key);
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch {
          // ignore
        }
      },
      removeItem: async (key: string) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {
          // ignore
        }
      },
    };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!convex) {
    return (
      <View style={styles.setupContainer}>
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Setup Required</Text>
          <Text style={styles.setupText}>
            To use this app, you need to configure Convex.
          </Text>
          <Text style={styles.setupStep}>
            1. Set up your Convex project{"\n"}
            2. Add environment variables to .env.local
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ConvexAuthProvider client={convex} storage={storage}>
      {children}
    </ConvexAuthProvider>
  );
}

export default AuthProvider;

const styles = StyleSheet.create({
  setupContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  setupCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  setupText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
    lineHeight: 22,
    textAlign: "center",
  },
  setupStep: {
    fontSize: 14,
    color: "#888",
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    lineHeight: 20,
  },
});
