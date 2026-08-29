import { Redirect, Stack } from "expo-router";
import { useSession } from "@/contexts/auth-context";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export default function AuthLayout() {
  const { session, isLoading, isPasswordRecovery } = useSession();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3629B7" />
      </View>
    );
  }

  // Allow access to new-password during password recovery even with a session
  if (session && !isPasswordRecovery) {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
        animation: "slide_from_right",
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
