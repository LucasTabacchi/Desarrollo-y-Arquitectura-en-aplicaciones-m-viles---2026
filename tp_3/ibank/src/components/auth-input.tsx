import React, { useState } from "react";
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AuthInputProps extends TextInputProps {
  label: string; // Kept for semantics/accessibility but hidden visually
  error?: string;
  isPassword?: boolean;
  rightIcon?: React.ReactNode;
}

export function AuthInput({
  label,
  error,
  isPassword = false,
  rightIcon,
  ...props
}: AuthInputProps) {
  const [secureEntry, setSecureEntry] = useState(isPassword);

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          placeholderTextColor="#CACACA"
          secureTextEntry={secureEntry}
          autoCapitalize="none"
          {...props}
        />
        {rightIcon ? (
          <View style={styles.toggle}>{rightIcon}</View>
        ) : isPassword ? (
          <TouchableOpacity
            onPress={() => setSecureEntry(!secureEntry)}
            style={styles.toggle}
            accessibilityLabel={
              secureEntry ? "Show password" : "Hide password"
            }
          >
            <Ionicons
              name={secureEntry ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#979797"
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20, // Increased margin for the design
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "stretch", // Stretches children to fill the 44px height
    backgroundColor: "transparent",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#CBCBCB",
    paddingHorizontal: 15,
    height: 44, // Match exact height from Figma
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  input: {
    flex: 1,
    height: "100%",
    paddingVertical: 0, // Removes Android default padding to maximize touch area
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#343434", // Darker text for input value
  },
  toggle: {
    paddingHorizontal: 8,
    marginRight: -8, // adjust icon padding
    justifyContent: "center", // Center icon vertically
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 4,
    marginLeft: 4,
  },
});
