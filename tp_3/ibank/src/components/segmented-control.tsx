import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({ options, selectedIndex, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isActive = selectedIndex === index;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.segment, isActive && styles.activeSegment]}
            onPress={() => onChange(index)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, isActive && styles.activeSegmentText]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#F5F5F7",
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  activeSegment: {
    backgroundColor: "#3629B7",
  },
  segmentText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "#8E8E93",
  },
  activeSegmentText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
});
