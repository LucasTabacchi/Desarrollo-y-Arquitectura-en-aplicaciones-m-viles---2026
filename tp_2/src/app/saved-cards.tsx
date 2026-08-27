import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCartStore } from '../store/useCartStore';
import { Feather } from '@expo/vector-icons';

export default function SavedCardsScreen() {
  const router = useRouter();
  const { savedCards, selectedCardId, selectCard, removeCard } = useCartStore();
  const [localSelected, setLocalSelected] = useState<string | null>(selectedCardId);

  useEffect(() => {
    setLocalSelected(selectedCardId);
  }, [selectedCardId]);

  const handleSave = () => {
    if (localSelected) {
      selectCard(localSelected);
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.backBtnText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Cards</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {savedCards.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No saved cards yet.</Text>
            </View>
          ) : (
            savedCards.map((card) => {
              const isSelected = card.id === localSelected;
              return (
                <TouchableOpacity 
                  key={card.id}
                  style={[styles.cardContainer, isSelected && styles.cardContainerSelected]}
                  onPress={() => setLocalSelected(card.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.radioRow}>
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={styles.cardInfo}>
                        <View style={[styles.mcLogo, { position: 'relative', right: 0, marginRight: 16 }]}>
                          <View style={[styles.mcCircle, { backgroundColor: '#EB001B', zIndex: 2 }]} />
                          <View style={[styles.mcCircle, { backgroundColor: '#F79E1B', marginLeft: -8, zIndex: 1 }]} />
                        </View>
                        <View>
                          <Text style={styles.cardTypeLabel}>My Virtual Debit Card</Text>
                          <Text style={styles.cardNumberMask}>● ● ●  {card.last4}</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity 
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => {
                        Alert.alert(
                          "Delete Card",
                          "Are you sure you want to remove this card?",
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => {
                                removeCard(card.id);
                                if (localSelected === card.id) setLocalSelected(null);
                            }}
                          ]
                        );
                      }}
                    >
                      <Feather name="trash-2" size={16} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity style={styles.addBtnRow} onPress={() => router.push('/add-card')}>
            <Text style={styles.addBtnPlus}>+</Text>
            <Text style={styles.addBtnText}>Add New Card</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnText: { fontSize: 24, color: '#3498db' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  content: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 14 },
  cardContainer: {
    backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  cardContainerSelected: { borderColor: '#3498db' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  radioRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  radio: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#CCC',
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  radioSelected: { borderColor: '#3498db' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3498db' },
  cardInfo: { flexDirection: 'row', alignItems: 'center' },
  mcLogo: { flexDirection: 'row', alignItems: 'center' },
  mcCircle: { width: 24, height: 24, borderRadius: 12, opacity: 0.8 },
  cardTypeLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  cardNumberMask: { fontSize: 14, color: '#1A1A1A', fontWeight: '600', letterSpacing: 2 },
  editIcon: { fontSize: 16, color: '#999' },
  addBtnRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  addBtnPlus: { fontSize: 20, color: '#3498db', marginRight: 8, fontWeight: '300' },
  addBtnText: { fontSize: 14, color: '#3498db', fontWeight: '600' },
  footer: {
    padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0F0F0'
  },
  saveBtn: {
    backgroundColor: '#3498db', paddingVertical: 14, borderRadius: 4, alignItems: 'center'
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});
