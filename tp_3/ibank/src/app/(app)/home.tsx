import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { supabase } from "@/lib/supabase";
import { AuthButton } from "@/components/auth-button";
import { useSession } from "@/contexts/auth-context";

export default function HomeScreen() {
  const { session } = useSession();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange will clear session → auto-redirect to login
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏦 iBank</Text>
      <Text style={styles.subtitle}>
        Bienvenido, {session?.user?.user_metadata?.full_name || session?.user?.email}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Email</Text>
        <Text style={styles.cardValue}>{session?.user?.email}</Text>
      </View>

      <AuthButton
        title="Cerrar sesión"
        onPress={handleLogout}
        variant="secondary"
        style={styles.logoutButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#8E8E93",
    marginBottom: 32,
  },
  card: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  cardValue: {
    fontSize: 16,
    color: "#1A1A2E",
    fontWeight: "500",
  },
  logoutButton: {
    marginTop: "auto",
    marginBottom: 40,
  },
});
