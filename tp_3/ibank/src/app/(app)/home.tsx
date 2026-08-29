import React, { useState } from "react";
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/contexts/auth-context";
import { SegmentedControl } from "@/components/segmented-control";
import { AccountItem, AccountData } from "@/components/account-item";
import { CreditCard, CreditCardData } from "@/components/credit-card";

const MOCK_ACCOUNTS: AccountData[] = [
  { id: "1", name: "Account 1", number: "1900 8988 1234", balance: 20000, branch: "New York" },
  { id: "2", name: "Account 2", number: "1900 8988 1234", balance: 20000, branch: "New York" },
  { id: "3", name: "Account 3", number: "1900 8988 1234", balance: 20000, branch: "New York" },
];

const MOCK_CARDS: CreditCardData[] = [
  {
    id: "1",
    cardholderName: "Push Puttichai", // We will override this with the real name
    cardName: "Amazon Platinium",
    maskedNumber: "4756 •••• •••• 9018",
    balance: 1400.67,
    type: "visa",
  },
  {
    id: "2",
    cardholderName: "Push Puttichai", // We will override this with the real name
    cardName: "Amazon Platinium",
    maskedNumber: "4756 •••• •••• 9018",
    balance: 1400.67,
    type: "mastercard",
  },
];

export default function HomeScreen() {
  const { session } = useSession();
  const [selectedTab, setSelectedTab] = useState(0); // 0 = Account, 1 = Card

  const userName = session?.user?.user_metadata?.full_name || session?.user?.email || "Usuario";

  // Use the logged in user's name for the cards
  const userCards = MOCK_CARDS.map(c => ({ ...c, cardholderName: userName }));

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderContent = () => {
    if (selectedTab === 0) {
      return (
        <FlatList
          data={MOCK_ACCOUNTS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AccountItem account={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    return (
      <FlatList
        data={userCards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CreditCard card={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <TouchableOpacity style={styles.addCardButton} activeOpacity={0.8}>
            <Text style={styles.addCardText}>+ Add card</Text>
          </TouchableOpacity>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLogout} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account and card</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3629B7&color=fff&size=128` }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>{userName}</Text>
        </View>

        {/* Tabs */}
        <SegmentedControl
          options={["Account", "Card"]}
          selectedIndex={selectedTab}
          onChange={setSelectedTab}
        />

        {/* List Content */}
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9F9FB", // Light grey background like Figma
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: "#1A1A2E",
  },
  profileSection: {
    alignItems: "center",
    marginVertical: 24,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  profileName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    color: "#1A1A2E",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  addCardButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderStyle: "dashed",
  },
  addCardText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: "#3629B7",
  },
});
