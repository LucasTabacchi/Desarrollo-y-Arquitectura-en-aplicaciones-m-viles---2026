import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { newPasswordSchema, NewPasswordFormData } from "@/lib/schemas";
import { mapAuthError } from "@/lib/error-mapper";
import { useSession } from "@/contexts/auth-context";
import { AuthInput } from "@/components/auth-input";
import { AuthButton } from "@/components/auth-button";
import { PasswordChecklist } from "@/components/password-checklist";
import { CustomNumericKeyboard } from "@/components/custom-numeric-keyboard";

export default function NewPasswordScreen() {
  const router = useRouter();
  const { isPasswordRecovery } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [showCustomKeyboard, setShowCustomKeyboard] = useState(false);
  const [focusedField, setFocusedField] = useState<"password" | "confirmPassword" | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors, isValid },
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    }
  });

  const passwordValue = watch("password");

  if (!isPasswordRecovery) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚠️</Text>
        </View>
        <Text style={styles.errorTitle}>Enlace inválido o expirado</Text>
        <Text style={styles.errorSubtitle}>
          El enlace para restablecer tu contraseña ya no es válido. Solicitá uno
          nuevo.
        </Text>
        <AuthButton
          title="Solicitar nuevo enlace"
          onPress={() => router.replace("/(auth)/forgot-password")}
          style={styles.errorButton}
        />
        <AuthButton
          title="Volver al login"
          onPress={() => router.replace("/(auth)/login")}
          variant="link"
        />
      </View>
    );
  }

  const onSubmit = async (data: NewPasswordFormData) => {
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (updateError) {
      setLoading(false);
      setError(mapAuthError(updateError));
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    setIsSuccess(true);
  };

  const handleKeyPress = (val: string) => {
    if (!focusedField) return;
    const current = getValues(focusedField) || "";
    setValue(focusedField, current + val);
    trigger(focusedField);
  };

  const handleDelete = () => {
    if (!focusedField) return;
    const current = getValues(focusedField) || "";
    setValue(focusedField, current.slice(0, -1));
    trigger(focusedField);
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.flex}>
          {/* Top Header */}
          <View style={styles.topHeader}>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#343434" />
            </TouchableOpacity>
          </View>

          <View style={styles.successContainer}>
            <Image 
              source={require("../../../assets/images/password-success.png")} 
              style={styles.successImage} 
              resizeMode="contain"
            />

            <Text style={styles.successTitle}>Change password successfully!</Text>
            <Text style={styles.successSubtitle}>
              You have successfully change password.{"\n"}Please use the new password when Sign in.
            </Text>

            <TouchableOpacity 
              style={styles.okButton}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text style={styles.okButtonText}>Ok</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.flex}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#343434" />
            <Text style={styles.headerTitle}>Change password</Text>
          </TouchableOpacity>
        </View>

        {/* Floating White Card */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Type your new password</Text>
            
            <Controller
              control={control}
              name="password"
              render={({ field: { value } }) => (
                <AuthInput
                  label="Password"
                  placeholder="********"
                  isPassword
                  value={value}
                  showSoftInputOnFocus={false}
                  onFocus={() => {
                    setFocusedField("password");
                    setShowCustomKeyboard(true);
                  }}
                  onBlur={() => setShowCustomKeyboard(false)}
                  error={errors.password?.message}
                  editable={!loading}
                />
              )}
            />

            <Text style={styles.inputLabel}>Confirm password</Text>
            
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { value } }) => (
                <AuthInput
                  label="Confirm Password"
                  placeholder="********"
                  isPassword
                  value={value}
                  showSoftInputOnFocus={false}
                  onFocus={() => {
                    setFocusedField("confirmPassword");
                    setShowCustomKeyboard(true);
                  }}
                  onBlur={() => setShowCustomKeyboard(false)}
                  error={errors.confirmPassword?.message}
                  editable={!loading}
                />
              )}
            />

            <PasswordChecklist password={passwordValue || ""} />

            <TouchableOpacity 
              style={[styles.changePasswordButton, isValid ? styles.changePasswordActive : styles.changePasswordDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || loading}
            >
              <Text style={styles.changePasswordText}>Change password</Text>
            </TouchableOpacity>

          </View>
        </View>
        
        {/* Custom Keyboard Positioned at Bottom */}
        {showCustomKeyboard && (
          <View style={styles.keyboardContainer}>
            <CustomNumericKeyboard 
              onPress={handleKeyPress} 
              onDelete={handleDelete}
              initialMode="letters"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9F9F9", // Matches neutral background behind the card
  },
  flex: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: "#F9F9F9", // Needs to match outer background if card is floating
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
    marginTop: 2,
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
  errorBanner: {
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#D32F2F",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  changePasswordButton: {
    height: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  changePasswordDisabled: {
    backgroundColor: "#F2F1F9",
  },
  changePasswordActive: {
    backgroundColor: "#3629B7",
  },
  changePasswordText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },
  keyboardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  
  // Error state (invalid/expired link)
  errorContainer: {
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
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 36,
  },
  errorTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: "#1A1A2E",
    marginBottom: 8,
  },
  errorSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  errorButton: {
    width: "100%",
    marginBottom: 12,
  },
  
  // Success state
  successContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    paddingTop: 40,
  },
  successImage: {
    width: "100%",
    height: 216,
    marginBottom: 40,
  },
  successTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    lineHeight: 24,
    color: "#3629B7",
    textAlign: "center",
    marginBottom: 16,
  },
  successSubtitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    lineHeight: 21,
    color: "#343434",
    textAlign: "center",
    marginBottom: 40,
  },
  okButton: {
    backgroundColor: "#3629B7",
    width: "100%",
    height: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 40,
  },
  okButtonText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
