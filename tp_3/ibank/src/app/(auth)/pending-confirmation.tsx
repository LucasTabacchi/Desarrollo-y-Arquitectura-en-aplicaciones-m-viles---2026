import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "@/lib/supabase";
import { CooldownButton } from "@/components/cooldown-button";
import { AuthButton } from "@/components/auth-button";

export default function PendingConfirmationScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  const handleResend = async () => {
    if (!email) return;
    await supabase.auth.resend({
      type: "signup",
      email,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📧</Text>
      </View>

      <Text style={styles.title}>Revisá tu email</Text>
      <Text style={styles.subtitle}>
        Enviamos un enlace de confirmación a:
      </Text>
      <Text style={styles.email}>{email}</Text>

      <Text style={styles.instructions}>
        Hacé clic en el enlace del email para activar tu cuenta. Si no lo
        encontrás, revisá la carpeta de spam.
      </Text>

      <CooldownButton
        title="Reenviar email"
        cooldownTitle="Reenviar email"
        onPress={handleResend}
        cooldownSeconds={60}
        variant="secondary"
        style={styles.resendButton}
      />

      <AuthButton
        title="Volver al login"
        onPress={() => router.replace("/(auth)/login")}
        variant="link"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 120,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginTop: 4,
    marginBottom: 24,
  },
  instructions: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  resendButton: {
    width: "100%",
    marginBottom: 12,
  },
});
