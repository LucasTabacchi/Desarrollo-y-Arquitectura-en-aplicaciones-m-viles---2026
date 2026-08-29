import React from "react";
import { View, Text, StyleSheet } from "react-native";

export interface AccountData {
  id: string;
  name: string;
  number: string;
  balance: number;
  branch: string;
}

interface AccountItemProps {
  account: AccountData;
}

export function AccountItem({ account }: AccountItemProps) {
  // Format balance as currency
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(account.balance);

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.row}>
        <Text style={styles.accountName}>{account.name}</Text>
        <Text style={styles.accountNumber}>{account.number}</Text>
      </View>

      {/* Detail Row: Balance */}
      <View style={styles.row}>
        <Text style={styles.label}>Available balance</Text>
        <Text style={styles.value}>{formattedBalance}</Text>
      </View>

      {/* Detail Row: Branch */}
      <View style={[styles.row, styles.lastRow]}>
        <Text style={styles.label}>Branch</Text>
        <Text style={styles.value}>{account.branch}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    // Soft shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    // Soft shadow for Android
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  lastRow: {
    marginBottom: 0,
  },
  accountName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#343434",
  },
  accountNumber: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#343434",
  },
  label: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#8E8E93",
  },
  value: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#3629B7",
  },
});
