import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CustomNumericKeyboardProps {
  onPress: (value: string) => void;
  onDelete: () => void;
  initialMode?: "letters" | "numbers";
}

const { width } = Dimensions.get("window");
const KEY_MARGIN = 4;
const KEY_WIDTH = (width - 12 - (9 * KEY_MARGIN)) / 10; // 10 keys max in a row, padding 6 on each side

export function CustomNumericKeyboard({ onPress, onDelete, initialMode = "letters" }: CustomNumericKeyboardProps) {
  const [mode, setMode] = useState<"letters" | "numbers">(initialMode);

  const letters1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
  const letters2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
  const letters3 = ["z", "x", "c", "v", "b", "n", "m"];
  const letters4 = ["123", "@", ".", ".com"];

  const numbers1 = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  const numbers2 = ["-", "/", ":", ";", "(", ")", "$", "&", "@", "\""];
  const numbers3 = [".", ",", "?", "!", "'", "_"];
  const numbers4 = ["ABC", "@", ".", ".com"];

  const row1 = mode === "letters" ? letters1 : numbers1;
  const row2 = mode === "letters" ? letters2 : numbers2;
  const row3 = mode === "letters" ? letters3 : numbers3;
  const row4 = mode === "letters" ? letters4 : numbers4;

  const handlePress = (val: string) => {
    if (val === "123") {
      setMode("numbers");
    } else if (val === "ABC") {
      setMode("letters");
    } else {
      onPress(val);
    }
  };

  const renderKey = (val: string, flexValue?: number, isSpecial = false) => (
    <TouchableOpacity
      key={val}
      style={[
        styles.button, 
        flexValue ? { flex: flexValue } : { width: KEY_WIDTH },
        isSpecial && styles.specialButton
      ]}
      onPress={() => handlePress(val)}
      activeOpacity={0.7}
    >
      <Text style={[styles.buttonText, isSpecial && styles.specialButtonText]}>{val}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {row1.map(k => renderKey(k))}
      </View>
      <View style={styles.row}>
        {row2.map(k => renderKey(k))}
      </View>
      <View style={styles.row}>
        {row3.map(k => renderKey(k))}
        <TouchableOpacity
          style={[styles.button, styles.specialButton, { flex: 1.5, marginLeft: KEY_MARGIN }]}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="backspace-outline" size={20} color="#000000" />
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        {row4.map((k, i) => renderKey(k, k === "123" || k === "ABC" || k === ".com" ? 2 : 1, k === "123" || k === "ABC"))}
      </View>
      
      {/* Home Indicator (Display Down) */}
      <View style={styles.homeIndicatorContainer}>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#D2D5DB",
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 24, // extra padding for home indicator
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    gap: KEY_MARGIN,
  },
  button: {
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#848688",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  specialButton: {
    backgroundColor: "#B4B8C1",
  },
  buttonText: {
    fontSize: 20,
    color: "#000000",
  },
  specialButtonText: {
    fontSize: 16,
    color: "#000000",
  },
  homeIndicatorContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  homeIndicator: {
    width: 134,
    height: 5,
    backgroundColor: "#000000",
    borderRadius: 100,
  },
});
