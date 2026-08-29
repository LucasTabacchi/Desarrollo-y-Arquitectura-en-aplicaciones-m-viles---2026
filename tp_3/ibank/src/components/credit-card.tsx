import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export type CardType = "visa" | "mastercard";

export interface CreditCardData {
  id: string;
  cardholderName: string;
  cardName: string; // e.g. "Amazon Platinium"
  maskedNumber: string;
  balance: number;
  type: CardType;
}

interface CreditCardProps {
  card: CreditCardData;
}

export function CreditCard({ card }: CreditCardProps) {
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(card.balance);

  // Gradient configurations based on card type
  const gradientColors = card.type === "visa"
    ? (["#2A2D5C", "#434B8E"] as const) // Dark blue to lighter blue
    : (["#F9A825", "#FF8F00"] as const); // Yellow to orange

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.cardholderName}>{card.cardholderName}</Text>
          <Text style={styles.cardName}>{card.cardName}</Text>
        </View>
        <Text style={styles.logo}>{card.type === "visa" ? "VISA" : "mastercard"}</Text>
      </View>

      <Text style={styles.cardNumber}>{card.maskedNumber}</Text>

      <View style={styles.footer}>
        <Text style={styles.balance}>{formattedBalance}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    // Add shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  cardholderName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  cardName: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  logo: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
    fontStyle: "italic",
  },
  cardNumber: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 2,
    marginBottom: 24,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  balance: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
  },
});
