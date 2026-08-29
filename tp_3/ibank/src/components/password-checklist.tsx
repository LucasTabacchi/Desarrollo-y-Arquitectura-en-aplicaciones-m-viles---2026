import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PASSWORD_RULES } from "@/lib/schemas";

interface PasswordChecklistProps {
  password: string;
}

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  return (
    <View style={styles.container}>
      {PASSWORD_RULES.map((rule) => {
        const passes = password.length > 0 && rule.test(password);
        return (
          <View key={rule.label} style={styles.row}>
            <Text style={styles.icon}>{passes ? "✅" : "❌"}</Text>
            <Text style={[styles.label, passes && styles.labelPassed]}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
    width: 20,
  },
  label: {
    fontSize: 13,
    color: "#8E8E93",
  },
  labelPassed: {
    color: "#34C759",
  },
});
