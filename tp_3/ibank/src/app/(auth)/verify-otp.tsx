import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { mapAuthError } from "@/lib/error-mapper";
import { AuthButton } from "@/components/auth-button";
import { CooldownButton } from "@/components/cooldown-button";

const OTP_LENGTH = 6;

export default function VerifyOtpScreen() {
  const { email, type } = useLocalSearchParams<{ email: string; type: string }>();
  const router = useRouter();
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus the hidden input when screen mounts
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  const handleVerify = async (otpCode: string) => {
    if (otpCode.length !== OTP_LENGTH) return;
    if (!email || !type) {
      setError("Faltan parámetros requeridos (email o type).");
      return;
    }

    setLoading(true);
    setError(null);

    // Ensure type is strongly typed for Supabase (signup, recovery, email, sms)
    const validTypes = ['signup', 'recovery', 'email', 'sms'];
    const otpType = validTypes.includes(type) ? type as any : 'email';

    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: otpType,
    });

    setLoading(false);

    if (authError) {
      setError(mapAuthError(authError));
      return;
    }

    // Success navigation handled by auth-context or manual route
    if (otpType === 'recovery') {
      router.replace("/(auth)/new-password");
    } else {
      // In case of signup, session is created and root _layout redirects to /(app)
      // But we can fallback just in case
      router.replace("/(app)/home");
    }
  };

  const handleChangeText = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setCode(numericText);
  };

  const handleResend = async () => {
    if (!email) return;
    setError(null);
    
    const { error: resendError } = await supabase.auth.resend({
      type: type === 'recovery' ? 'signup' : 'signup', // Subabase resend mostly supports signup for email resend
      email,
    });
    
    // Si era recovery, resetPasswordForEmail re-envía
    if (type === 'recovery') {
      await supabase.auth.resetPasswordForEmail(email);
    }

    if (resendError && type !== 'recovery') {
      setError(mapAuthError(resendError));
    }
  };

  // Generate boxes for visual representation
  const renderOtpBoxes = () => {
    const boxes = [];
    for (let i = 0; i < OTP_LENGTH; i++) {
      const isFocused = code.length === i;
      const digit = code[i] || "";
      boxes.push(
        <View key={i} style={[styles.box, isFocused && styles.boxFocused]}>
          <Text style={styles.boxText}>{digit}</Text>
        </View>
      );
    }
    return boxes;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.flex}>
          {/* Top Header */}
          <View style={styles.topHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#343434" />
              <Text style={styles.headerTitle}>Verificación</Text>
            </TouchableOpacity>
          </View>

          {/* Card */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.title}>Ingresá tu código</Text>
              <Text style={styles.subtitle}>
                Enviamos un código de seguridad de {OTP_LENGTH} dígitos a:{"\n"}
                <Text style={styles.emailText}>{email}</Text>
              </Text>

              {error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              {/* OTP Visual Input */}
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={() => inputRef.current?.focus()}
                style={styles.otpContainer}
              >
                {renderOtpBoxes()}
              </TouchableOpacity>

              {/* Hidden text input for keyboard handling */}
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={code}
                onChangeText={handleChangeText}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={OTP_LENGTH}
                autoFocus
              />

              <AuthButton
                title="Verificar"
                onPress={() => handleVerify(code)}
                loading={loading}
                disabled={code.length !== OTP_LENGTH || loading}
                style={styles.verifyButton}
              />

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>¿No recibiste el código? </Text>
                <CooldownButton
                  title="Reenviar"
                  cooldownTitle="Reenviar"
                  onPress={handleResend}
                  cooldownSeconds={60}
                  variant="link"
                  style={styles.resendCooldown}
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 24,
    color: "#3629B7",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#898989",
    textAlign: "center",
    marginBottom: 32,
  },
  emailText: {
    fontFamily: "Poppins_600SemiBold",
    color: "#343434",
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
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  box: {
    width: 45,
    height: 55,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
  },
  boxFocused: {
    borderColor: "#3629B7",
    backgroundColor: "#FFFFFF",
  },
  boxText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 24,
    color: "#343434",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  verifyButton: {
    marginBottom: 24,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#898989",
  },
  resendCooldown: {
    padding: 0,
  },
});
