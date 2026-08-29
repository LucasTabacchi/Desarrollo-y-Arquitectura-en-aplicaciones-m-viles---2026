import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { forgotPasswordSchema, ForgotPasswordFormData } from "@/lib/schemas";
import { AuthInput } from "@/components/auth-input";
import { CooldownButton } from "@/components/cooldown-button";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async () => {
    setLoading(true);
    const data = getValues();
    const redirectUrl = Linking.createURL("reset-password");

    console.log("[forgot-password] redirectUrl:", redirectUrl);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email);

    console.log("[forgot-password] resetError:", resetError);

    setLoading(false);

    if (resetError) {
      console.error("[forgot-password] Error:", resetError.message, resetError.status);
    }

    // Navigate to OTP verification
    router.push({
      pathname: "/(auth)/verify-otp",
      params: { email: data.email, type: "recovery" },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.flex}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#343434" />
            <Text style={styles.headerTitle}>Forgot password</Text>
          </TouchableOpacity>
        </View>

        {/* Floating White Card */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
              <>
                <Text style={styles.inputLabel}>Type your email address</Text>

                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <AuthInput
                      label="Email"
                      placeholder="ejemplo@banco.com"
                      keyboardType="email-address"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value}
                      error={errors.email?.message}
                      editable={!loading}
                    />
                  )}
                />

                <Text style={styles.description}>
                  We will email you a link to reset your password
                </Text>

                <CooldownButton
                  title="Send"
                  cooldownTitle="Send"
                  onPress={handleSubmit(onSubmit)}
                  cooldownSeconds={60}
                  disabled={!isValid || loading}
                  variant="primary"
                  style={styles.sendButton}
                />
              </>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  topHeader: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#343434",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    marginLeft: 8,
    marginTop: 4,
  },
  cardContainer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    shadowColor: "#3629B7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 5,
  },
  inputLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#979797",
    marginBottom: 8,
  },
  description: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "#343434",
    marginBottom: 24,
    lineHeight: 21,
    marginTop: -4,
  },
  sendButton: {
    marginTop: 8,
  },

  // Success state
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 28,
  },
  successTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#3629B7",
    textAlign: "center",
    marginBottom: 12,
  },
  successMessage: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    lineHeight: 21,
    color: "#898989",
    textAlign: "center",
    marginBottom: 24,
  },
  resendButton: {
    marginBottom: 16,
  },
  backToLoginButton: {
    alignSelf: "center",
    padding: 8,
  },
  backToLoginText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#3629B7",
  },
});
