import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";

import { supabase } from "@/lib/supabase";
import { registerSchema, RegisterFormData } from "@/lib/schemas";
import { mapAuthError } from "@/lib/error-mapper";
import { AuthInput } from "@/components/auth-input";
import { AuthButton } from "@/components/auth-button";
import { PasswordChecklist } from "@/components/password-checklist";

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as unknown as true,
    },
  });

  const passwordValue = watch("password");

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);

    const redirectUrl = Linking.createURL("confirm");

    const { error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
        },
        emailRedirectTo: redirectUrl,
      },
    });

    setLoading(false);

    if (authError) {
      setError(mapAuthError(authError));
      return;
    }

    // Anti-enumeration: ALWAYS navigate to pending confirmation,
    // whether the email existed or not.
    router.push({
      pathname: "/(auth)/pending-confirmation",
      params: { email: data.email },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Blue Header */}
          <View style={styles.topHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* White Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Welcome to us,</Text>
              <Text style={styles.subtitle}>Hello there, create New account</Text>
            </View>

            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <Image 
                source={require("../../../assets/images/register-illustration.png")} 
                style={{ width: 213, height: 165 }} 
                resizeMode="contain" 
              />
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <AuthInput
                  label="Name"
                  placeholder="Name"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.fullName?.message}
                  editable={!loading}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <AuthInput
                  label="Email"
                  placeholder="Text input" // Matches Figma placeholder
                  keyboardType="email-address"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                  editable={!loading}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <AuthInput
                  label="Password"
                  placeholder="Password"
                  isPassword
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                  editable={!loading}
                />
              )}
            />

            <PasswordChecklist password={passwordValue || ""} />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <AuthInput
                  label="Confirm Password"
                  placeholder="Confirm password"
                  isPassword
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.confirmPassword?.message}
                  editable={!loading}
                />
              )}
            />

            <Controller
              control={control}
              name="acceptTerms"
              render={({ field: { onChange, value } }) => (
                <View style={styles.termsRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, value && styles.checkboxChecked]}
                    onPress={() => onChange(!value)}
                  >
                    {value && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </TouchableOpacity>
                  <Text style={styles.termsText}>
                    By creating an account your aggree to our <Text style={styles.termsLink}>Term and Condtions</Text>
                  </Text>
                </View>
              )}
            />
            {errors.acceptTerms && (
              <Text style={styles.termsError}>{errors.acceptTerms.message}</Text>
            )}

            <AuthButton
              title="Sign up"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={!isValid}
              style={styles.submitButton}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.signInText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3629B7",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topHeader: {
    backgroundColor: "#3629B7",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    marginLeft: 8,
    marginTop: 2,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  cardHeader: {
    marginBottom: 24,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 24,
    color: "#3629B7",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#343434",
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  errorBanner: {
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#D32F2F",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingRight: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#BFBFBF",
    borderRadius: 4,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#3629B7",
    borderColor: "#3629B7",
  },
  termsText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#343434",
    flex: 1, // To make text wrap
  },
  termsLink: {
    fontFamily: "Poppins_600SemiBold",
    color: "#3629B7",
  },
  termsError: {
    color: "#FF3B30",
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#343434",
  },
  signInText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#3629B7",
  },
});
