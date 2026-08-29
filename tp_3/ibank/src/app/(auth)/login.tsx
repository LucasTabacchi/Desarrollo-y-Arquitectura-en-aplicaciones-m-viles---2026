import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { loginSchema, LoginFormData } from "@/lib/schemas";
import { mapAuthError } from "@/lib/error-mapper";
import { AuthInput } from "@/components/auth-input";
import { AuthButton } from "@/components/auth-button";
import { useBiometrics } from "@/hooks/use-biometrics";
import { saveCredentials, getCredentials } from "@/lib/secure-storage";

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const { isBiometricSupported, hasBiometricRecords, authenticate } = useBiometrics();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  // Cooldown timer for rate limiting
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setLoading(false);

    if (authError) {
      if (
        authError.status === 429 ||
        authError.message.toLowerCase().includes("rate limit")
      ) {
        setCooldown(60);
      }

      if (authError.message.toLowerCase().includes("email not confirmed")) {
        router.push({
          pathname: "/(auth)/pending-confirmation",
          params: { email: data.email },
        });
        return;
      }

      setError(mapAuthError(authError));
      return;
    }

    // Save credentials on successful manual login
    await saveCredentials({ email: data.email, password: data.password });
  };

  const handleBiometricLogin = async () => {
    if (!isBiometricSupported) {
      setError("Tu dispositivo no soporta autenticación biométrica.");
      return;
    }
    if (!hasBiometricRecords) {
      setError("No tenés huellas o rostros registrados en tu dispositivo.");
      return;
    }

    const credentials = await getCredentials();

    if (!credentials || !credentials.email || !credentials.password) {
      setError("Debes iniciar sesión con contraseña al menos una vez para usar tu huella.");
      return;
    }

    const isSuccess = await authenticate();
    if (!isSuccess) {
      // User cancelled or failed
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    setLoading(false);

    if (authError) {
      setError(mapAuthError(authError));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
        >
          {/* Top Blue Header */}
          <View style={styles.topHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Sign in</Text>
            </TouchableOpacity>
          </View>

          {/* White Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Hello there, sign in to continue</Text>
            </View>

            {/* Illustration */}
            <View style={styles.illustrationContainer} pointerEvents="none">
              <Image
                source={require("../../../assets/images/login-illustration.png")}
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
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <AuthInput
                  label="Email"
                  placeholder="Text input"
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
                  label="Contraseña"
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

            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
                <Text style={styles.forgotPasswordText}>Forgot your password ?</Text>
              </TouchableOpacity>
            </View>

            <AuthButton
              title={
                cooldown > 0
                  ? `Too many attempts (${cooldown}s)`
                  : "Sign in"
              }
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={!isValid || cooldown > 0}
              style={styles.signInButton}
            />

            <TouchableOpacity style={styles.fingerprintContainer} onPress={handleBiometricLogin} disabled={loading}>
              <Ionicons name="finger-print" size={64} color={loading ? "#A0A0A0" : "#3629B7"} />
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={styles.signUpText}>Sign Up</Text>
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
    backgroundColor: "#3629B7", // Match the top background color
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
    paddingTop: 24,
    paddingBottom: 16,
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
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 24,
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
    marginTop: 8,
    marginBottom: 32,
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
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: 40,
    marginTop: -8, // pull up closer to the input
  },
  forgotPasswordText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    color: "#CACACA",
  },
  signInButton: {
    marginBottom: 24,
  },
  fingerprintContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#343434",
  },
  signUpText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#3629B7",
  },
});
