import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from "react-native";

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "link";
  style?: ViewStyle;
}

export function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: AuthButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "link" && styles.link,
        isDisabled && variant === "primary" && styles.primaryDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#FFFFFF" : "#3629B7"}
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === "primary" && styles.primaryText,
            variant === "secondary" && styles.secondaryText,
            variant === "link" && styles.linkText,
            isDisabled && variant === "primary" && styles.primaryTextDisabled,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  primary: {
    backgroundColor: "#3629B7",
  },
  primaryDisabled: {
    backgroundColor: "#F2F1F9",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3629B7",
  },
  link: {
    backgroundColor: "transparent",
    paddingVertical: 8,
    minHeight: 36,
  },
  text: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
  },
  primaryText: {
    color: "#FFFFFF",
  },
  primaryTextDisabled: {
    color: "#CBCBCB", // Readable disabled state
  },
  secondaryText: {
    color: "#3629B7",
  },
  linkText: {
    color: "#3629B7",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold", // "Sign Up" uses SemiBold
  },
});
